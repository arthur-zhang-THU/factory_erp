import React, { useEffect, useState } from 'react';
import { Drawer, Button, message, Card } from 'antd';
import { MenuOutlined, SaveOutlined } from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';

interface RoutingStep {
    id: number;
    seq_no: number;
    process_name: string;
    workcenter: string;
    std_minutes: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    woId: number | null;
}

// 📦 可拖拽的单行组件
const SortableItem = ({ step }: { step: RoutingStep }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none' // 防止手机端滚动冲突
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            className="bg-white p-4 mb-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between cursor-move hover:shadow-md hover:border-blue-300 transition-all"
        >
            <div className="flex items-center gap-4">
                <MenuOutlined className="text-gray-400" />
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {step.seq_no}
                </div>
                <div>
                    <div className="font-bold text-gray-700">{step.process_name}</div>
                    <div className="text-xs text-gray-400">{step.workcenter}</div>
                </div>
            </div>
            <div className="text-gray-500 font-mono">
                {step.std_minutes} min
            </div>
        </div>
    );
};

const RoutingEditor: React.FC<Props> = ({ open, onClose, woId }) => {
    const [steps, setSteps] = useState<RoutingStep[]>([]);
    const [loading, setLoading] = useState(false);

    // 加载数据
    useEffect(() => {
        if (open && woId) {
            fetchRouting();
        }
    }, [open, woId]);

    const fetchRouting = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/work_orders/${woId}/routing`);
            setSteps(res.data);
        } catch (e) {
            message.error('加载工艺失败');
        } finally {
            setLoading(false);
        }
    };

    // 🤚 拖拽结束时的回调
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                
                // 重新计算 seq_no 仅用于前端显示，实际保存时会按数组顺序提交
                const newArray = arrayMove(items, oldIndex, newIndex);
                return newArray.map((item, idx) => ({ ...item, seq_no: idx + 1 }));
            });
        }
    };

    // 💾 保存新顺序
    const handleSave = async () => {
        try {
            const stepIds = steps.map(s => s.id); // 提取 ID 列表
            await axios.post(`http://localhost:8000/work_orders/${woId}/routing/reorder`, {
                step_ids: stepIds
            });
            message.success('✅ 工艺顺序已更新');
            onClose();
        } catch (e) {
            message.error('保存失败');
        }
    };

    return (
        <Drawer
            title="🔧 调整工艺路线 (Drag & Drop)"
            open={open}
            onClose={onClose}
            width={500}
            footer={
                <div className="flex justify-end">
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                        保存新顺序
                    </Button>
                </div>
            }
        >
            <div className="bg-gray-50 p-4 rounded-xl min-h-[400px]">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {steps.map((step) => (
                            <SortableItem key={step.id} step={step} />
                        ))}
                    </SortableContext>
                </DndContext>
                
                {steps.length === 0 && !loading && (
                    <div className="text-center text-gray-400 mt-10">
                        暂无工艺步骤，请先创建工单
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default RoutingEditor;