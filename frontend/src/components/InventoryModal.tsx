import React, { useEffect, useState } from 'react';
import { Modal, Table, Tag, message, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
// ❌ 删除: import axios from 'axios';
// ✅ 新增: 使用封装好的 api
import api from '../api';

// ✅ 修正: 对应后端 MaterialDetailsDTO 的字段
interface InventoryItem {
    id: number;            // 后端返回的是 id
    name: string;
    spec: string;
    current_stock: number; // 后端返回的是 current_stock
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const InventoryModal: React.FC<Props> = ({ open, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<InventoryItem[]>([]);
    const [searchText, setSearchText] = useState('');

    // 表格列定义
    const columns = [
        { 
            title: 'ID', 
            dataIndex: 'id', // ✅ 修正为 id
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
            dataIndex: 'current_stock', // ✅ 修正为 current_stock
            key: 'current_stock',
            align: 'right' as const,
            render: (val: number) => {
                // 库存 < 10 为低库存预警
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
            // ✅ 修改: 使用 api.get，移除 http://localhost:8000
            const res = await api.get<InventoryItem[]>('/inventory/status');
            setData(res.data);
        } catch (error: any) {
            console.error(error);
            // 401 错误会被 api.ts 拦截，这里只提示网络或其他错误
            if (error.response?.status !== 401) {
                message.error('获取库存失败');
            }
        } finally {
            setLoading(false);
        }
    };

    // 前端简单搜索过滤
    const filteredData = data.filter(item => 
        item.name.includes(searchText) || 
        (item.spec && item.spec.includes(searchText)) ||
        String(item.id).includes(searchText)
    );

    return (
        <Modal
            title={<div className="text-lg font-bold">🏭 实时库存监控</div>}
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
            centered
        >
            <div className="mb-4 flex gap-2">
                <Input 
                    placeholder="搜索物料名称、规格或ID..." 
                    prefix={<SearchOutlined />} 
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                />
                <Button onClick={fetchInventory} loading={loading}>刷新</Button>
            </div>

            <Table 
                dataSource={filteredData} 
                columns={columns} 
                rowKey="id" // ✅ 修正主键
                loading={loading}
                pagination={{ pageSize: 6 }}
                bordered
                size="middle"
            />
        </Modal>
    );
};

export default InventoryModal;