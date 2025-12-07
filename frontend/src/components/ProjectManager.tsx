import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Tag, message, Card } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs'; // 处理日期
import BOMEditor from './BOMEditor'; // <--- 引入
import { ToolOutlined } from '@ant-design/icons'; // 引入一个小工具图标

// 定义接口 (跟后端 Pydantic 模型对齐)
interface Project {
    id: number;
    name: string;
    customer_name: string;
    sign_type: string;
    due_date: string;
    created_at?: string;
}

const ProjectManager: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    // 控制 BOM 抽屉的状态
    const [isBomOpen, setIsBomOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<{id: number, name: string} | null>(null);

    // 1. 获取项目列表
    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/projects/');
            setProjects(res.data);
        } catch (error) {
            message.error('获取项目列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        fetchProjects();
    }, []);

    // 2. 提交新项目
    const handleCreate = async (values: any) => {
        try {
            // 格式化日期：AntD DatePicker 返回的是 dayjs 对象，需要转成 YYYY-MM-DD 字符串
            const payload = {
                ...values,
                due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null
            };

            await axios.post('http://localhost:8000/projects/', payload);
            
            message.success('🎉 项目立项成功！');
            setIsModalOpen(false);
            form.resetFields();
            fetchProjects(); // 刷新列表
        } catch (error: any) {
            message.error('创建失败: ' + (error.response?.data?.detail || '未知错误'));
        }
    };

    // 表格列定义
    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60, align: 'center' as const },
        { 
            title: '项目名称', 
            dataIndex: 'name', 
            render: (text: string) => <b className="text-blue-600">{text}</b> 
        },
        { title: '客户', dataIndex: 'customer_name' },
        { 
            title: '招牌类型', 
            dataIndex: 'sign_type',
            render: (text: string) => <Tag color="blue">{text || '普通'}</Tag>
        },
        { 
            title: '交付截止日', 
            dataIndex: 'due_date',
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
        },
        {
            title: '工程设计',
            key: 'action',
            render: (_: any, record: Project) => (
                <Button 
                    type="dashed" 
                    size="small" 
                    icon={<ToolOutlined />}
                    onClick={() => {
                        setCurrentProject({ id: record.id, name: record.name });
                        setIsBomOpen(true);
                    }}
        >
            设计 BOM
        </Button>
    )
}
    ];


    return (
        <div className="space-y-4">
            {/* 顶部工具栏 */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-700">项目列表 (Projects)</h3>
                <div className="space-x-2">
                    <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>
                        刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                        新建项目
                    </Button>
                </div>
            </div>

            {/* 数据表格 */}
            <Table 
                columns={columns} 
                dataSource={projects} 
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                className="shadow-sm bg-white rounded-lg"
            />

            {/* 新建立项弹窗 */}
            <Modal
                title="📝 新建立项 (Project Initiation)"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null} // 使用表单自带的提交按钮
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4">
                    <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
                        <Input placeholder="例如：万达广场楼顶大字" />
                    </Form.Item>
                    
                    <Form.Item label="客户名称" name="customer_name" rules={[{ required: true }]}>
                        <Input placeholder="例如：万达集团" />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="招牌类型" name="sign_type" initialValue="灯箱">
                            <Input placeholder="例如：冲孔字、树脂字" />
                        </Form.Item>
                        <Form.Item label="交付日期" name="due_date">
                            <DatePicker className="w-full" />
                        </Form.Item>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                        <Button type="primary" htmlType="submit">🚀 立即立项</Button>
                    </div>
                </Form>
            </Modal>
            <BOMEditor 
                open={isBomOpen}
                onClose={() => setIsBomOpen(false)}
                projectId={currentProject?.id || null}
                projectName={currentProject?.name || ''}
            />
        </div>
    );
};

export default ProjectManager;