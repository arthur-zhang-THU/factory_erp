import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Card, Popconfirm } from 'antd';
import { UserAddOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false); // 加载状态
  const [form] = Form.useForm();

  // 1️⃣ 获取用户列表 (READ)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 如果后端还没有这个接口，你会看到报错，需要去后端 auth.py 补上
      const res = await axios.get(`${API_URL}/auth/users`);
      setUsers(res.data);
    } catch (error) {
      message.error('无法加载用户列表 (可能是后端接口未就绪)');
    } finally {
      setLoading(false);
    }
  };

  // 进页面时加载一次
  useEffect(() => {
    fetchUsers();
  }, []);

  // 2️⃣ 创建用户 (CREATE)
  const handleCreateUser = async (values: any) => {
    try {
      await axios.post(`${API_URL}/auth/register`, values);
      message.success(`员工 ${values.username} 创建成功！`);
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers(); // 创建完刷新列表
    } catch (error: any) {
      message.error('创建失败: ' + (error.response?.data?.detail || '用户名可能已存在'));
    }
  };

  // 3️⃣ 删除用户 (DELETE)
  const handleDelete = async (id: number) => {
    try {
        await axios.delete(`${API_URL}/auth/users/${id}`);
        message.success('已删除');
        fetchUsers();
    } catch (error) {
        message.error('删除失败');
    }
  };

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', render: (t: string) => <b>{t}</b> },
    { 
        title: '角色权限', 
        dataIndex: 'role',
        render: (role: string) => {
            let color = 'geekblue';
            let label = role;
            if (role === 'ADMIN') { color = 'red'; label = '👑 老板'; }
            if (role === 'DESIGNER') { color = 'purple'; label = '🎨 设计师'; }
            if (role === 'WORKER') { color = 'green'; label = '👷 工人'; }
            if (role === 'FOREMAN') { color = 'orange'; label = '👷‍♂️ 工头'; }
            return <Tag color={color}>{label}</Tag>
        }
    },
    { 
        title: '状态', 
        dataIndex: 'is_active', 
        render: (act: boolean) => act ? <Tag color="success">正常</Tag> : <Tag color="error">禁用</Tag> 
    },
    {
        title: '操作',
        render: (_: any, record: any) => (
            <Popconfirm title="确定开除该员工吗？" onConfirm={() => handleDelete(record.id)}>
                <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
        )
    }
  ];

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">员工账号管理</h2>
        <div className="space-x-2">
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)}>
            新增员工
            </Button>
        </div>
      </div>

      {/* 列表显示区 (替换了原来的空 Card) */}
      <Table 
        dataSource={users} 
        columns={columns} 
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 6 }}
      />

      {/* 新增弹窗 */}
      <Modal
        title="👤 新增员工账号"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreateUser} layout="vertical" className="mt-4">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="例如：zhangsan" />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true }]}>
            <Input.Password placeholder="例如：123456" />
          </Form.Item>
          
          <Form.Item name="role" label="角色权限" initialValue="WORKER">
            <Select>
              <Select.Option value="WORKER">👷 工人 (仅车间终端)</Select.Option>
              {/* ✅ 重点修改：增加了工头角色 */}
              <Select.Option value="FOREMAN">👷‍♂️ 工头 (可排程 + 车间)</Select.Option>
              <Select.Option value="DESIGNER">🎨 设计师 (项目 + 财务Invoice)</Select.Option>
              <Select.Option value="ADMIN">👑 老板 (全权 + 财务)</Select.Option>
            </Select>
          </Form.Item>
          
          <Button type="primary" htmlType="submit" block className="mt-2">
            创建账号
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManager;