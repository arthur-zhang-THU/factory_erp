import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8000'; // ⚠️ 部署时请改为服务器IP

interface ProcessEditorProps {
  open: boolean;
  onClose: () => void;
  woId: number | null;
  projectTitle: string;
}

export default function ProcessEditor({ open, onClose, woId, projectTitle }: ProcessEditorProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // 🆕 新增加载状态

  // 🔄 初始化：加载数据
  useEffect(() => {
    if (open && woId) {
      loadData();
    }
  }, [open, woId]);

  // 🆕 核心逻辑：同时拉取工人和现有排程
  const loadData = async () => {
    setLoading(true);
    try {
      const [resWorkers, resSteps] = await Promise.all([
        axios.get(`${API_URL}/work_orders/users/workers`), // 1. 拿工人
        axios.get(`${API_URL}/work_orders/${woId}/steps`)  // 2. 拿现有工序
      ]);

      setWorkers(resWorkers.data);

      // 如果后端返回了工序，就填进去；否则置空
      if (resSteps.data && resSteps.data.length > 0) {
        setSteps(resSteps.data);
      } else {
        setSteps([]); 
      }
    } catch (e) {
      message.error("数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '顺序',
      render: (_: any, __: any, index: number) => <span className="text-gray-400 font-bold">Step {index + 1}</span>,
      width: 80,
    },
    {
      title: '工序名称',
      dataIndex: 'name',
      render: (text: string, record: any, index: number) => (
        <Input 
          value={text} 
          onChange={e => {
            const newSteps = [...steps];
            newSteps[index].name = e.target.value;
            setSteps(newSteps);
          }} 
          placeholder="如: 激光切割" 
        />
      ),
    },
    {
      title: '指派工人 (可选)',
      dataIndex: 'assigned_to',
      width: 180,
      render: (val: number, record: any, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="-- 抢单模式 --"
          allowClear
          value={val}
          onChange={v => {
            const newSteps = [...steps];
            newSteps[index].assigned_to = v;
            setSteps(newSteps);
          }}
        >
          {workers.map(w => (
            <Select.Option key={w.id} value={w.id}>{w.username}</Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
            const newSteps = [...steps];
            newSteps.splice(index, 1);
            setSteps(newSteps);
        }} />
      ),
    },
  ];

  const handleSave = async () => {
    if (!woId) return;
    if (steps.some(s => !s.name)) return message.error("工序名称不能为空");
    
    try {
      await axios.post(`${API_URL}/work_orders/${woId}/steps`, steps);
      message.success("✅ 排程已发布！工人将收到任务。");
      onClose();
    } catch (e) { message.error("保存失败"); }
  };

  // 快速模板
  const applyTemplate = () => {
    setSteps([
      { name: '激光切割', assigned_to: null },
      { name: '围边焊接', assigned_to: null },
      { name: '组装测试', assigned_to: null },
    ]);
  };

  return (
    <Modal
      title={`🛠️ 工艺排程: ${projectTitle}`}
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存并发布</Button>
      ]}
    >
      <div className="mb-4">
        <Button size="small" type="dashed" onClick={applyTemplate}>使用 "发光字" 模板</Button>
      </div>
      
      <Table 
        dataSource={steps} 
        columns={columns} 
        rowKey={(r) => r.id || Math.random().toString()} // 兼容新旧数据
        pagination={false} 
        size="small" 
        bordered 
        loading={loading} // 🆕 表格加载状态
      />
      
      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setSteps([...steps, { name: '', assigned_to: null }])} className="mt-2">
        添加工序
      </Button>
    </Modal>
  );
}