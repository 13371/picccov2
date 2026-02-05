'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import BackButton from '../app/components/BackButton';
import AlertDialog from '../app/components/AlertDialog';

interface Folder {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface Note {
  id: string;
  title?: string;
  content?: string;
  folderId?: string | null;
  folder?: Folder;
}

interface NoteEditorScreenProps {
  mode: 'create' | 'edit';
  noteId?: string;
}

export default function NoteEditorScreen({ mode, noteId }: NoteEditorScreenProps) {
  const router = useRouter();
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // 数据状态
  const [note, setNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(mode === 'edit'); // create 模式不需要加载
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // 保存状态
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // 对话框状态
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title?: string;
    message: string;
  }>({
    open: false,
    message: "",
  });

  // 原始数据（用于 dirty 检测）
  // create 模式：初始值为空值
  // edit 模式：从服务器加载的数据
  const originalDataRef = useRef<{
    title: string;
    content: string;
    folderId: string | null;
  } | null>(mode === 'create' ? { title: '', content: '', folderId: null } : null);

  // 加载文件夹列表
  const loadFolders = useCallback(async () => {
    try {
      const resp = await apiGet('/folders/list?kind=NOTES');
      const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
      setFolders(foldersList.filter((f: Folder) => !f.isPrivate)); // 只显示非隐私文件夹
    } catch (err) {
      console.error('加载文件夹列表失败:', err);
      // 不阻止页面加载，只是下拉列表为空
      setFolders([]);
    }
  }, []);

  // 加载笔记数据（仅 edit 模式）
  const loadNote = useCallback(async () => {
    if (mode !== 'edit' || !noteId) return;

    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet(`/items/${noteId}`);
      const noteData = resp?.data || resp;

      if (!noteData) {
        throw new Error('笔记不存在');
      }

      setNote(noteData);
      const noteTitle = noteData.title || '';
      const noteContent = noteData.content || '';
      const noteFolderId = noteData.folderId || null;

      setTitle(noteTitle);
      setContent(noteContent);
      setSelectedFolderId(noteFolderId);

      // 保存原始数据用于 dirty 检测
      originalDataRef.current = {
        title: noteTitle,
        content: noteContent,
        folderId: noteFolderId,
      };
    } catch (err: any) {
      console.error('加载笔记失败:', err);
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [mode, noteId]);

  // 初始加载
  useEffect(() => {
    loadFolders();
    loadNote();
  }, [loadFolders, loadNote]);

  // 内容框默认 focus
  useEffect(() => {
    if (!loading && contentInputRef.current) {
      // 延迟一点确保 DOM 已渲染
      setTimeout(() => {
        contentInputRef.current?.focus();
      }, 100);
    }
  }, [loading]);

  // create 模式：确保 edit 模式才需要 noteId
  useEffect(() => {
    if (mode === 'edit' && !noteId) {
      setError('编辑模式需要提供 noteId');
      setLoading(false);
    }
  }, [mode, noteId]);

  // 计算是否 dirty
  const isDirty = useCallback(() => {
    if (!originalDataRef.current) return false;
    const original = originalDataRef.current;
    // create 模式：只要有任何输入就认为是 dirty
    // edit 模式：与原始数据比较
    return (
      title !== original.title ||
      content !== original.content ||
      selectedFolderId !== original.folderId
    );
  }, [title, content, selectedFolderId]);

  // 保存
  const handleSave = async () => {
    if (!isDirty() || saving) return;

    try {
      setSaving(true);
      setSaveStatus('saving');

      if (mode === 'create') {
        // 新建模式：调用 POST /items
        const payload = {
          type: 'NOTE' as const,
          title: title.trim() || undefined,
          content: content.trim() || '', // NOTE 的 content 必须存在，允许为空字符串
          folderId: selectedFolderId,
        };

        const res = await apiPost('/items', payload);
        const createdNoteId = res?.data?.id;

        if (!createdNoteId) {
          throw new Error('创建成功但未返回笔记ID');
        }

        // 更新原始数据
        if (originalDataRef.current) {
          originalDataRef.current = {
            title: title.trim(),
            content: content.trim(),
            folderId: selectedFolderId,
          };
        }

        setSaveStatus('saved');
        // 保存成功后跳转到编辑页
        setTimeout(() => {
          router.push(`/notes/${createdNoteId}`);
        }, 500);
      } else {
        // 编辑模式：调用 PATCH /items/:id
        if (!noteId) {
          throw new Error('编辑模式需要 noteId');
        }

        const updateData: any = {};
        if (title !== originalDataRef.current?.title) {
          updateData.title = title.trim() || null;
        }
        if (content !== originalDataRef.current?.content) {
          updateData.content = content.trim(); // NOTE 的 content 允许为空字符串
        }
        if (selectedFolderId !== originalDataRef.current?.folderId) {
          updateData.folderId = selectedFolderId;
        }

        await apiPatch(`/items/${noteId}`, updateData);

        // 更新原始数据
        if (originalDataRef.current) {
          originalDataRef.current = {
            title: title.trim(),
            content: content.trim(),
            folderId: selectedFolderId,
          };
        }

        setSaveStatus('saved');
        // 3秒后恢复 idle
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (err: any) {
      console.error('保存失败:', err);
      setAlertDialog({ open: true, message: err?.message || '保存失败' });
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  // 取消：永远只做 router.back()，不调用任何 API
  const handleCancel = () => {
    // 硬规则：不弹确认框、不保存、不调用 POST/PATCH，直接返回
    router.back();
  };

  // 获取当前文件夹名称
  const getCurrentFolderName = () => {
    if (selectedFolderId === null) {
      return '未分类';
    }
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder?.name || '未分类';
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>加载中…</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
        <BackButton onClick={handleCancel} />
      </div>
    );
  }

  const dirty = isDirty();
  const canSave = dirty && !saving;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}>
        {/* 左侧：返回 */}
        <BackButton onClick={handleCancel} />

        {/* 中间：文件夹选择下拉 */}
        <div style={{ position: 'relative', flex: 1, margin: '0 16px' }}>
          <select
            value={selectedFolderId || ''}
            onChange={(e) => {
              const newFolderId = e.target.value === '' ? null : e.target.value;
              setSelectedFolderId(newFolderId);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #4a90e2',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            <option value="">未分类</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* 右侧：保存 */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: canSave ? '#007bff' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: canSave ? 'pointer' : 'not-allowed',
            minWidth: '60px',
          }}
        >
          {saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '已保存' : '保存'}
        </button>
      </div>

      {/* 标题输入框 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>无标题</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {title.length}/10
          </span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 10) {
              setTitle(value);
            }
          }}
          placeholder="无标题"
          maxLength={10}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '16px',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* 内容输入框 */}
      <div style={{
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <textarea
          ref={contentInputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入内容..."
          style={{
            flex: 1,
            width: '100%',
            padding: '8px',
            fontSize: '16px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* 提示对话框 */}
      <AlertDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      />
    </div>
  );
}

