import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, message, Tag, Space, Card } from 'antd';
import { PlusOutlined, ToolOutlined, PayCircleOutlined, WalletOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import BOMEditor from './BOMEditor'; // ✅ 保留 BOM 编辑器组件

const API_URL = 'http://localhost:8000';

const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- 状态管理 ---
  const [currentProject, setCurrentProject] = useState<any>(null); // 当前操作的项目

  // 1. 新建项目 Modal 状态
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  // 2. BOM 编辑器状态 (保留老功能)
  const [isBomOpen, setIsBomOpen] = useState(false);

  // 3. 财务收款 Modal 状态 (新增功能)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billForm] = Form.useForm();

  // --- 初始化加载 ---
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/projects/`);
      setProjects(res.data);
    } catch (error) {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  // --- 提交新建项目 ---
  const handleCreateProject = async () => {
    try {
      const values = await createForm.validateFields();
      await axios.post(`${API_URL}/projects/`, {
        name: values.name,
        customer_name: values.customer_name,
        sign_type: values.sign_type,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      });
      message.success('🎉 项目立项成功！');
      setIsCreateOpen(false);
      createForm.resetFields();
      fetchProjects();
    } catch (error) {
      message.error('创建失败，请检查输入');
    }
  };

  // --- 打开收款弹窗 ---
  const openBillModal = (record: any) => {
    setCurrentProject(record);
    billForm.setFieldsValue({
      title: `${record.name} - 合同首付款`,
      total_amount: '',
      due_date: dayjs(), // 默认今天
    });
    setIsBillModalOpen(true);
  };

  // --- 提交生成账单 ---
  const handleGenerateBill = async () => {
    try {
      const values = await billForm.validateFields();
      await axios.post(`${API_URL}/finance/invoices`, {
        project_id: currentProject.id,
        title: values.title,
        inv_type: 'RECEIVABLE', // 默认为应收
        status: 'UNPAID',
        total_amount: parseFloat(values.total_amount),
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      });
      
      message.success(`✅ 已为【${currentProject.name}】生成应收单！`);
      setIsBillModalOpen(false);
    } catch (error) {
      message.error('生成账单失败');
    }
  };

  // --- 表格列定义 ---
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      align: 'center' as const,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-bold text-blue-600">{text}</span>,
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: '招牌类型',
      dataIndex: 'sign_type',
      key: 'sign_type',
      render: (text: string) => <Tag color="blue">{text || '标准'}</Tag>,
    },
    {
      title: '交付日期',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: any) => (
        <Space size="small">
          {/* ✅ 按钮 1: 设计 BOM (老功能) */}
          <Button 
            icon={<ToolOutlined />} 
            size="small"
            onClick={() => {
                setCurrentProject(record);
                setIsBomOpen(true);
            }}
          >
            设计 BOM
          </Button>

          {/* 🆕 按钮 2: 收款开单 (新功能) */}
          <Button 
            type="primary" 
            ghost 
            size="small"
            icon={<PayCircleOutlined />} 
            onClick={() => openBillModal(record)}
          >
            收款
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部栏 */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-700">项目管理 (Projects)</h3>
        <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>
                刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
                新建项目
            </Button>
        </Space>
      </div>

      {/* 项目表格 */}
      <Card bordered={false} className="shadow-sm">
        <Table 
          rowKey="id" 
          columns={columns} 
          dataSource={projects} 
          loading={loading} 
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* --- Modal 1: 新建项目 --- */}
      <Modal
        title="📝 新建项目"
        open={isCreateOpen}
        onOk={handleCreateProject}
        onCancel={() => setIsCreateOpen(false)}
        okText="确认创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：万达广场楼顶大字" />
          </Form.Item>
          <Form.Item name="customer_name" label="客户名称" rules={[{ required: true }]}>
            <Input placeholder="例如：王总" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sign_type" label="招牌类型" initialValue="发光字">
                <Input />
            </Form.Item>
            <Form.Item name="due_date" label="交付截止日">
                <DatePicker className="w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* --- Modal 2: 财务收款 (联动) --- */}
      <Modal
        title={<span><WalletOutlined /> 生成应收账单</span>}
        open={isBillModalOpen}
        onOk={handleGenerateBill}
        onCancel={() => setIsBillModalOpen(false)}
        okText="确认开单"
        cancelText="取消"
      >
        <p className="mb-4 text-gray-500">
          即将为项目 <b>{currentProject?.name}</b> 创建一笔应收账款记录，并在财务系统中生成欠条。
        </p>
        <Form form={billForm} layout="vertical">
          <Form.Item name="title" label="账单标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="total_amount" label="应收金额 (¥)" rules={[{ required: true, message: '请输入金额' }]}>
            <Input type="number" prefix="¥" className="font-bold text-lg" />
          </Form.Item>
          <Form.Item name="due_date" label="最晚付款日">
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- Modal 3: BOM 编辑器 (组件) --- */}
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