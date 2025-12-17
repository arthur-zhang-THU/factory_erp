import React, { useEffect, useState } from 'react';
import { Drawer, Table, Button, Form, Select, InputNumber, message, Popconfirm, Card, Statistic } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
// ❌ 删除: import axios from 'axios';
// ✅ 新增: 引入 api (自动带 Token)
import api from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    projectId: number | null;
    projectName: string;
}

// BOM 行的数据结构
interface BOMItem {
    id: number;
    material_name: string;
    material_spec: string;
    material_std_cost: number;
    qty_per: number;
    scrap_rate: number;
}

// 基础物料用于下拉选择
interface MaterialOption {
    id: number;
    name: string;
    spec: string;
}

const BOMEditor: React.FC<Props> = ({ open, onClose, projectId, projectName }) => {
    const [bomItems, setBomItems] = useState<BOMItem[]>([]);
    const [materials, setMaterials] = useState<MaterialOption[]>([]);
    const [loading, setLoading] = useState(false);
    
    // 表单控制
    const [form] = Form.useForm();

    // 1. 初始化：加载基础物料列表（用于下拉框）
    useEffect(() => {
        if (open) {
            fetchMaterials();
            if (projectId) fetchBOM();
        }
    }, [open, projectId]);

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/inventory/status');
            setMaterials(res.data);
        } catch (error) {
            message.error('加载物料库失败');
        }
    };

    const fetchBOM = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            // ✅ 修改点 2: 使用 api.get
            const res = await api.get(`/bom/${projectId}`);
            setBomItems(res.data);
        } catch (error) {
            // 401 会被 api.ts 拦截，这里只提示业务错误
            message.error('加载 BOM 失败');
        } finally {
            setLoading(false);
        }
    };

    // 2. 添加物料到 BOM
    const handleAdd = async (values: any) => {
        if (!projectId) return;
        try {
            // ✅ 修改点 3: 使用 api.post
            await api.post(`/bom/${projectId}/items`, values);
            message.success('已添加');
            form.resetFields();
            fetchBOM(); // 刷新列表
        } catch (error) {
            message.error('添加失败');
        }
    };

    // 3. 删除行
    const handleDelete = async (itemId: number) => {
        try {
            // ✅ 修改点 4: 使用 api.delete
            await api.delete(`/bom/items/${itemId}`);
            message.success('已删除');
            fetchBOM();
        } catch (error) {
            message.error('删除失败');
        }
    };

    // 计算预估总成本
    const totalCost = bomItems.reduce((sum, item) => {
        const cost = item.material_std_cost * item.qty_per * (1 + item.scrap_rate);
        return sum + cost;
    }, 0);

    const columns = [
        { title: '物料名称', dataIndex: 'material_name', key: 'name' },
        { title: '规格', dataIndex: 'material_spec', key: 'spec', render: (t:any) => <span className="text-gray-400 text-xs">{t}</span> },
        { 
            title: '单件用量', 
            dataIndex: 'qty_per', 
            key: 'qty',
            render: (val: number) => <b className="text-blue-600">{val}</b>
        },
        { 
            title: '损耗率', 
            dataIndex: 'scrap_rate', 
            key: 'scrap',
            render: (val: number) => <span>{(val * 100).toFixed(0)}%</span>
        },
        { 
            title: '预估小计', 
            key: 'subtotal',
            render: (_: any, record: BOMItem) => {
                const sub = record.material_std_cost * record.qty_per * (1 + record.scrap_rate);
                return `¥${sub.toFixed(2)}`;
            }
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: BOMItem) => (
                <Popconfirm title="确定移除?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <Drawer
            title={`🛠️ 工程设计 BOM: ${projectName}`}
            width={720}
            onClose={onClose}
            open={open}
            styles={{ body: { paddingBottom: 80 } }}
        >
            {/* 顶部：添加区域 */}
            <Card className="mb-4 bg-gray-50" size="small" title="添加物料">
                <Form layout="inline" form={form} onFinish={handleAdd}>
                    <Form.Item name="material_id" rules={[{ required: true, message: '请选择' }]} style={{ width: 200 }}>
                        <Select 
                            placeholder="选择原材料..." 
                            showSearch
                            optionFilterProp="children"
                        >
                            {materials.map(m => (
                                <Select.Option key={m.id} value={m.id}>
                                    {m.name} <span className="text-gray-400 text-xs">({m.spec})</span>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item name="qty_per" rules={[{ required: true }]} initialValue={1} style={{ width: 100 }}>
                        <InputNumber min={0.01} placeholder="用量" addonAfter="个" />
                    </Form.Item>

                    <Form.Item name="scrap_rate" initialValue={0} style={{ width: 120 }}>
                        <Select placeholder="损耗率">
                            <Select.Option value={0}>无损耗</Select.Option>
                            <Select.Option value={0.05}>5% 损耗</Select.Option>
                            <Select.Option value={0.10}>10% 损耗</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* 中部：列表区域 */}
            <Table
                columns={columns}
                dataSource={bomItems}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="small"
                bordered
            />

            {/* 底部：总成本统计 */}
            <div className="mt-8 flex justify-end">
                <Card size="small" style={{ width: 200 }}>
                    <Statistic 
                        title="预估材料总成本" 
                        value={totalCost} 
                        precision={2} 
                        prefix="¥"
                        valueStyle={{ color: '#cf1322' }} 
                    />
                </Card>
            </div>
        </Drawer>
    );
};

export default BOMEditor;