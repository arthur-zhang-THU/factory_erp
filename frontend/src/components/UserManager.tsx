import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Card } from 'antd';
import { UserAddOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState([]); // 实际需要后端加个 GET /auth/users 接口，这里先演示创建
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreateUser = async (values: any) => {
    try {
      await axios.post(`${API_URL}/auth/register`, values);
      message.success(`员工 ${values.username} 创建成功！`);
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error('创建失败，用户名可能已存在');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">员工账号管理</h2>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)}>
          新增员工
        </Button>
      </div>

      <Card>
        <div className="text-center text-gray-400 py-10">
          (此处可以列表显示所有员工，目前主要功能是右上角的“新增”)
        </div>
      </Card>

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
              <Select.Option value="DESIGNER">🎨 设计师 (后台业务管理)</Select.Option>
              <Select.Option value="ADMIN">👨‍💼 老板 (全权 + 财务)</Select.Option>
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