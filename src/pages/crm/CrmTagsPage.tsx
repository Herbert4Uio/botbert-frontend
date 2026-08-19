import { useState, useEffect } from 'react';
import { crmService } from '../../services/crm.service';

export function CrmTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#EF4444');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tgs = await crmService.getTags();
    setTags(tgs);
  };

  const handleCreateTag = async () => {
    if (!newTagName) return;
    await crmService.createTag({ name: newTagName, color: newTagColor });
    setNewTagName('');
    loadData();
  };

  const handleDeleteTag = async (id: string) => {
    await crmService.deleteTag(id);
    loadData();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Etiquetas (Tags)</h1>
      
      <div className="max-w-3xl">

        {/* Tags Config */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Etiquetas</h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="color" 
              className="h-10 w-10 border rounded-md cursor-pointer"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
            />
            <input 
              type="text" 
              className="border p-2 rounded-md flex-1" 
              placeholder="Nombre del tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <button 
              className="bg-corporate-600 text-white px-4 py-2 rounded-md hover:bg-corporate-700"
              onClick={handleCreateTag}
            >
              Crear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span 
                key={t._id} 
                className="px-3 py-1 rounded-full text-white text-sm flex items-center gap-2"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
                <button onClick={() => handleDeleteTag(t._id)} className="font-bold hover:text-black">&times;</button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
