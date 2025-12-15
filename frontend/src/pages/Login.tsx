import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Card, message, Typography } from 'antd';

const { Title, Text } = Typography;

// ⚠️ 部署时记得把这里换成服务器 IP
const API_URL = 'http://localhost:8000';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values: any) => {
  setLoading(true);
  try {
    // ⚠️ 使用 URLSearchParams 将对象转换为 form-urlencoded
    const formData = new URLSearchParams();
    formData.append("username", values.username);
    formData.append("password", values.password);
    formData.append("grant_type", "password"); // OAuth2PasswordRequestForm 默认需要
    formData.append("scope", "");              // 可选

    const res = await axios.post(`${API_URL}/auth/token`, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, role, username } = res.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', username);

    message.success(`登录成功！欢迎, ${username}`);

    if (role === 'WORKER') {
      navigate('/worker'); 
    } else {
      navigate('/'); 
    }

  } catch (error: any) {
    console.error(error);
    const msg = error.response?.data?.detail || '登录失败，请检查账号密码';
    message.error(msg);
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
              <Input prefix={<UserOutlined />} placeholder="账号 (如: admin)" />
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