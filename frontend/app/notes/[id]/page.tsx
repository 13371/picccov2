'use client';

import NoteEditorScreen from '../../../components/NoteEditorScreen';

export default function Page({ params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    return <div style={{ padding: 16 }}>无效的笔记 ID</div>;
  }

  return <NoteEditorScreen mode="edit" noteId={id} />;
}
