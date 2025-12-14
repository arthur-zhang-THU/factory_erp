import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, DatePicker, Tag, message, Space } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, PartitionOutlined } from '@ant-design/icons';
import axios from 'axios';
import ProcessEditor from './ProcessEditor'; // ✅ 只引入这一个编辑器

// ⚠️ 记得部署时改 IP
const API_URL = 'http://localhost:8000';

interface WorkOrder {
    id: number;
    project_name: string;
    status: string;
    planned_start: string;
    planned_end: string;
}

const WorkOrderManager: React.FC = () => {
    const [wos, setWos] = useState<WorkOrder[]>([]);
    const [projects, setProjects] = useState<any[]>([]); 
    
    // 创建工单弹窗状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // 🆕 工艺排程弹窗状态
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [currentWo, setCurrentWo] = useState<WorkOrder | null>(null);

    // 1. 加载工单列表
    const fetchWos = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/work_orders/`);
            setWos(res.data);
        } catch (error) {
            message.error('加载工单列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 2. 加载项目列表
    const fetchProjects = async () => {
        try {
            const res = await axios.get(`${API_URL}/projects/`);
            setProjects(res.data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        fetchWos();
    }, []);

    // 3. 创建工单
    const handleCreate = async (values: any) => {
        try {
            const payload = {
                project_id: values.project_id,
                planned_start: values.dates ? values.dates[0].format('YYYY-MM-DD') : null,
                planned_end: values.dates ? values.dates[1].format('YYYY-MM-DD') : null,
                qty: 1
            };
            await axios.post(`${API_URL}/work_orders/`, payload);
            message.success('✅ 生产指令已下达！');
            setIsModalOpen(false);
            form.resetFields();
            fetchWos();
        } catch (error) {
            message.error('创建失败');
        }
    };

    const columns = [
        { title: 'WO #', dataIndex: 'id', width: 80, align: 'center' as const },
        { title: '关联项目', dataIndex: 'project_name', render: (t:string) => <b>{t}</b> },
        { 
            title: '状态', 
            dataIndex: 'status',
            render: (status: string) => {
                let color = 'default';
                if (status === 'IN_PROGRESS') color = 'processing';
                if (status === 'COMPLETED') color = 'success';
                return <Tag color={color}>{status}</Tag>
            }
        },
        { 
            title: '计划周期', 
            render: (_:any, r: WorkOrder) => (
                <span className="text-gray-500 text-sm">
                    {r.planned_start} ~ {r.planned_end}
                </span>
            )
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: WorkOrder) => (
                <Space>
                    {/* 🆕 排程按钮 */}
                    <Button 
                        size="small" 
                        icon={<PartitionOutlined />} 
                        onClick={() => {
                            setCurrentWo(record);
                            setIsProcessOpen(true);
                        }}
                    >
                        排程 / 派工
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-700">生产工单 (Work Orders)</h3>
                <div className="space-x-2">
                    <Button icon={<ReloadOutlined />} onClick={fetchWos}>刷新</Button>
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { setIsModalOpen(true); fetchProjects(); }}>
                        下达生产指令
                    </Button>
                </div>
            </div>

            <Table 
                columns={columns} 
                dataSource={wos} 
                rowKey="id" 
                loading={loading}
            />

            {/* 创建工单 Modal */}
            <Modal
                title="🚀 下达生产工单"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4">
                    <Form.Item name="project_id" label="选择项目" rules={[{ required: true }]}>
                        <Select placeholder="请选择要生产的项目...">
                            {projects.map(p => (
                                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="dates" label="计划起止日期">
                        <DatePicker.RangePicker className="w-full" />
                    </Form.Item>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                        <Button type="primary" htmlType="submit">确认下达</Button>
                    </div>
                </Form>
            </Modal>

            {/* ✅ 统一使用 ProcessEditor */}
            <ProcessEditor 
                open={isProcessOpen}
                onClose={() => setIsProcessOpen(false)}
                woId={currentWo?.id || null}
                projectTitle={currentWo?.project_name || ''}
            />
        </div>
    );
};

export default WorkOrderManager;