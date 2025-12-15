import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, message, Tag, Spin, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, HolderOutlined, CloudUploadOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';

// 🏗️ 引入 DND Kit (拖拽核心库)
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = 'http://localhost:8000';

// --- 🎯 子组件：可拖拽的单行工序 ---
const SortableItem = ({ step, index, updateStep, removeStep, workers }: any) => {
  // 兼容新旧数据：有id用id，没id用tempId
  const uniqueId = step.id || step.tempId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: uniqueId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto', 
    opacity: isDragging ? 0.5 : 1,     
    position: 'relative' as 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white p-3 mb-2 rounded border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* ✋ 拖拽手柄 */}
      <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-blue-500 p-2">
        <HolderOutlined style={{ fontSize: '18px' }} />
      </div>

      {/* 序号 */}
      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
        {index + 1}
      </div>

      {/* 工序名称 */}
      <div className="flex-1">
        <Input 
          value={step.name} 
          onChange={(e) => updateStep(index, 'name', e.target.value)}
          placeholder="工序名称" 
          variant="borderless" 
          className="font-bold text-gray-700"
        />
      </div>

      {/* 指派下拉框 */}
      <div className="w-48">
        <Select
          style={{ width: '100%' }}
          placeholder="-- 抢单模式 --"
          allowClear
          value={step.assigned_to}
          onChange={(v) => updateStep(index, 'assigned_to', v)}
          options={workers.map((w:any) => ({ label: w.username, value: w.id }))}
        />
      </div>

      {/* 状态 Tag */}
      <div className="w-20 text-center">
         {step.status === 'COMPLETED' ? <Tag color="success">完成</Tag> : 
          step.status === 'IN_PROGRESS' ? <Tag color="processing">进行中</Tag> : <Tag>待定</Tag>}
      </div>

      {/* 删除按钮 */}
      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeStep(index)} />
    </div>
  );
};

// --- 🚀 主组件 ---
export default function ProcessEditor({ open, onClose, woId, projectTitle }: any) {
  const [steps, setSteps] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 模板相关状态
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  // 拖拽传感器 (优化触控体验)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 🔄 初始化
  useEffect(() => {
    if (open) loadAllData();
  }, [open, woId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
    const token = localStorage.getItem('token') || '';
    const [resUsers, resSteps, resTpl] = await Promise.all([
      axios.get(`${API_URL}/auth/users`, { headers: { Authorization: `Bearer ${token}` }}),
      woId ? axios.get(`${API_URL}/work_orders/${woId}/steps`) : { data: [] },
      axios.get(`${API_URL}/templates/`) 
    ]);

      setWorkers(resUsers.data.filter((u: any) => ['WORKER', 'FOREMAN'].includes(u.role)));
      setTemplates(resTpl.data);

      if (resSteps.data && resSteps.data.length > 0) {
        setSteps(resSteps.data.sort((a: any, b: any) => a.sequence - b.sequence));
      } else {
        setSteps([]); 
      }
    } catch (e) { message.error("数据加载失败"); } 
    finally { setLoading(false); }
  };

  // --- 🛠️ 核心操作逻辑 ---

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => (i.id || i.tempId) === active.id);
        const newIndex = items.findIndex((i) => (i.id || i.tempId) === over.id);
        return arrayMove(items, oldIndex, newIndex); 
      });
    }
  };

  const updateStep = (index: number, key: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index][key] = value;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, { tempId: `new-${Date.now()}`, name: '', assigned_to: null }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/work_orders/${woId}/steps`, steps);
      message.success("✅ 排程发布成功！");
      onClose();
    } catch (e) { message.error("保存失败"); } 
    finally { setSaving(false); }
  };

  // --- 📋 模板功能 ---

  const applyTemplate = (tplId: number) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;
    
    const newSteps = tpl.steps.map((s: any) => ({
      name: s.name,
      assigned_to: null, 
      tempId: `tpl-${Date.now()}-${Math.random()}`
    }));
    
    if (steps.length > 0) {
        setSteps([...steps, ...newSteps]);
        message.success(`已追加模板: ${tpl.name}`);
    } else {
        setSteps(newSteps);
        message.success(`已加载模板: ${tpl.name}`);
    }
  };

  const saveAsTemplate = async () => {
    if (!newTemplateName) return message.warning("请输入模板名称");
    if (steps.length === 0) return message.warning("没有工序可存");

    try {
      const cleanSteps = steps.map(s => ({ name: s.name, assigned_to: null })); 
      const res = await axios.post(`${API_URL}/templates/`, { name: newTemplateName, steps: cleanSteps });
      
      setTemplates([res.data, ...templates]); 
      setNewTemplateName('');
      setShowSaveTpl(false);
      message.success("✨ 模板保存成功！");
    } catch (e) { message.error("保存模板失败"); }
  };

  const deleteTemplate = async (id: number) => {
    try {
        await axios.delete(`${API_URL}/templates/${id}`);
        setTemplates(templates.filter(t => t.id !== id));
        message.success("模板已删除");
    } catch(e) { message.error("删除失败"); }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
            <span>🛠️ 工艺排程:</span>
            <span className="text-blue-600">{projectTitle}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={800}
      maskClosable={false}
      zIndex={1050}
      footer={[
        <Button key="close" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" size="large" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
           保存并发布
        </Button>
      ]}
    >
      <div className="space-y-4">
        {/* 工具栏 */}
        <div className="bg-gray-50 p-2 rounded flex justify-between items-center border border-gray-200">
            <Space>
                <CloudUploadOutlined className="text-blue-500" />
                <span className="font-bold text-gray-600">模板:</span>
                <Select 
                    placeholder="选择模板..." 
                    style={{ width: 200 }}
                    onChange={applyTemplate}
                    optionLabelProp="label"
                >
                    {templates.map(t => (
                        <Select.Option key={t.id} value={t.id} label={t.name}>
                            <div className="flex justify-between items-center group">
                                <span>{t.name}</span>
                                <DeleteOutlined className="text-gray-300 hover:text-red-500 hidden group-hover:block" onClick={(e:any) => { e.stopPropagation(); deleteTemplate(t.id); }} />
                            </div>
                        </Select.Option>
                    ))}
                </Select>
                
                {showSaveTpl ? (
                    <Space.Compact>
                        <Input size="small" placeholder="名称" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} style={{width: 120}} />
                        <Button type="primary" size="small" onClick={saveAsTemplate}>保存</Button>
                        <Button size="small" onClick={() => setShowSaveTpl(false)}>X</Button>
                    </Space.Compact>
                ) : (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => setShowSaveTpl(true)}>存为模板</Button>
                )}
            </Space>
            <div className="text-xs text-gray-400 flex items-center gap-1">
                <HolderOutlined /> 拖拽排序
            </div>
        </div>

        {/* 拖拽区域 */}
        <Spin spinning={loading}>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map(s => s.id || s.tempId)} strategy={verticalListSortingStrategy}>
                {steps.map((step, index) => (
                  <SortableItem 
                    key={step.id || step.tempId} 
                    step={step} 
                    index={index} 
                    updateStep={updateStep} 
                    removeStep={removeStep}
                    workers={workers}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            <Button type="dashed" block size="large" icon={<PlusOutlined />} onClick={addStep} className="mt-2">
              添加工序
            </Button>
          </div>
        </Spin>
      </div>
    </Modal>
  );
}