import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Card, message, Typography } from 'antd';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      // 1. 发送表单数据 (OAuth2 格式要求 x-www-form-urlencoded)
      const formData = new FormData();
      formData.append('username', values.username);
      formData.append('password', values.password);

      const res = await axios.post('http://localhost:8000/auth/token', formData);
      const { access_token } = res.data;

      // 2. 解析 Token 获取角色 (简单 Base64 解码 payload)
      // JWT 格式: header.payload.signature
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      const role = payload.role;

      // 3. 存 Token 和 角色
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('user', values.username);

      message.success('登录成功！欢迎回来');

      // 4. 根据角色跳转不同页面
      if (role === 'WORKER') {
        navigate('/worker'); // 工人去车间
      } else {
        navigate('/'); // 老板和设计师去后台
      }

    } catch (error) {
      message.error('账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl overflow-hidden border-0">
        <div className="bg-indigo-600 p-8 text-center">
          <Title level={2} style={{ color: 'white', margin: 0 }}>🏭 Factory ERP</Title>
          <Text className="text-indigo-200 mt-2 block">企业数字化管理系统</Text>
        </div>
        
        <div className="p-8 pt-10">
          <Form
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入账号!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="账号 (admin/worker...)" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} className="bg-indigo-600 h-12 text-lg font-bold">
                登 录
              </Button>
            </Form.Item>
          </Form>
          <div className="text-center text-gray-400 text-xs">
            如忘记密码，请联系管理员 (老板) 重置
          </div>
        </div>
      </Card>
    </div>
  );
}