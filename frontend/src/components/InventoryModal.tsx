import React, { useEffect, useState } from 'react';
import { Modal, Table, Tag, message } from 'antd';
import axios from 'axios';

// 定义从后端返回的数据格式
interface InventoryItem {
    material_id: number;
    name: string;
    spec: string;
    onhand: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const InventoryModal: React.FC<Props> = ({ open, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<InventoryItem[]>([]);

    // 表格列定义
    const columns = [
        { 
            title: 'ID', 
            dataIndex: 'material_id', 
            width: 60,
            align: 'center' as const,
        },
        { 
            title: '物料名称', 
            dataIndex: 'name', 
            key: 'name',
            render: (text: string) => <span className="font-bold">{text}</span>
        },
        { 
            title: '规格', 
            dataIndex: 'spec', 
            key: 'spec',
            render: (text: string) => <span className="text-gray-500 text-sm">{text || '-'}</span>
        },
        { 
            title: '当前库存', 
            dataIndex: 'onhand', 
            key: 'onhand',
            align: 'right' as const,
            render: (val: number) => {
                // 文档逻辑：库存 < 10 为低库存预警
                const isLow = val < 10;
                return (
                    <Tag color={isLow ? 'volcano' : 'green'} className="text-sm px-2">
                        {val}
                    </Tag>
                );
            }
        },
    ];

    // 打开弹窗时自动刷新数据
    useEffect(() => {
        if (open) {
            fetchInventory();
        }
    }, [open]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            // 注意：这里假设你的后端跑在 8000 端口
            // 如果你在 docker-compose 里通过 nginx 转发，可能需要改成 '/api/inventory/status'
            const res = await axios.get('http://localhost:8000/inventory/status');
            setData(res.data);
        } catch (error) {
            console.error(error);
            message.error('获取库存失败，请检查后端服务是否启动');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<div className="text-lg font-bold">🏭 实时库存监控</div>}
            open={open}
            onCancel={onClose}
            footer={null} // 查库存不需要“确认”按钮，只需要关闭
            width={700}
            centered
        >
            <Table 
                dataSource={data} 
                columns={columns} 
                rowKey="material_id"
                loading={loading}
                pagination={{ pageSize: 5 }}
                bordered
                size="middle"
            />
        </Modal>
    );
};

export default InventoryModal;