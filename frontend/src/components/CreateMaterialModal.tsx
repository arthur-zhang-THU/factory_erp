import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Button, message } from 'antd';
import axios from 'axios';

interface Props {
    open: boolean;
    onClose: () => void;
}

const CreateMaterialModal: React.FC<Props> = ({ open, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            // 对接你在后端 inventory.py 写的 create_material 接口
            // 接口路径: POST /inventory/material
            // 参数结构: { name: str, spec: str, std_cost: float }
            await axios.post('http://localhost:8000/inventory/material', values);
            
            message.success('✅ 物料创建成功！你现在可以去扫码入库了');
            form.resetFields();
            onClose(); // 关闭弹窗
        } catch (error: any) {
            console.error(error);
            message.error('创建失败: ' + (error.response?.data?.detail || '未知错误'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="🆕 新增基础物料 (Master Data)"
            open={open}
            onCancel={onClose}
            footer={null}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ spec: '默认规格', std_cost: 0 }}
            >
                <Form.Item 
                    label="物料名称" 
                    name="name" 
                    rules={[{ required: true, message: '请输入物料名称，例如：3mm亚克力板' }]}
                >
                    <Input placeholder="例如：3mm 亚克力板" size="large" />
                </Form.Item>

                <Form.Item 
                    label="规格型号" 
                    name="spec"
                >
                    <Input placeholder="例如：1220x2440 透明" size="large" />
                </Form.Item>

                <Form.Item 
                    label="标准成本 (¥)" 
                    name="std_cost"
                    help="用于后续计算项目成本偏差"
                >
                    <InputNumber 
                        style={{ width: '100%' }} 
                        prefix="¥" 
                        min={0} 
                        precision={2} 
                        size="large" 
                    />
                </Form.Item>

                <div className="flex justify-end gap-3 mt-6">
                    <Button onClick={onClose} size="large">取消</Button>
                    <Button type="primary" htmlType="submit" loading={loading} size="large">
                        确认创建
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default CreateMaterialModal;