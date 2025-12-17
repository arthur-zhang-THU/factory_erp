import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Spin } from 'antd';
// ✅ 必须引入 api，绝对不能再用 axios
import api from '../api';

interface MaterialData {
    id?: number; 
    name: string;
    spec: string;
    std_cost: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    materialId: number | null; 
    onSuccess: () => void;
}

const CreateMaterialModal: React.FC<Props> = ({ open, onClose, materialId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [form] = Form.useForm();

    const isEditing = materialId !== null;
    
    useEffect(() => {
        if (!open) return;

        // 如果是编辑模式，加载数据
        if (isEditing && materialId) {
            setInitialLoading(true);
            const fetchMaterialData = async () => {
                try {
                    // ✅ 使用 api.get，它会自动去 localStorage 拿 'token'
                    const response = await api.get<MaterialData>(`/inventory/material/${materialId}`);
                    form.setFieldsValue(response.data);
                } catch (error: any) {
                    // 401 错误会被 api.ts 拦截跳转登录，这里忽略
                    if (error.response?.status !== 401) {
                        message.error('加载数据失败');
                    }
                    onClose(); 
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchMaterialData();
        } else {
            // 创建模式：重置表单并设置默认值
            form.resetFields(); // 显式重置，防止残留
            form.setFieldsValue({ spec: '默认规格', std_cost: 0 });
        }
    }, [open, materialId, isEditing, form, onClose]);

    const handleSubmit = async (values: MaterialData) => {
        setLoading(true);
        let url = '/inventory/material';
        let method: 'post' | 'put' = 'post';
        
        if (isEditing) {
            url = `${url}/${materialId}`;
            method = 'put';
        }

        try {
            // ✅ 使用 api 调用，后端收到请求会自动验证 Token
            await api({
                method: method,
                url: url,
                data: values,
            });
            
            message.success(`✅ 物料${isEditing ? '更新' : '创建'}成功！`);
            onSuccess(); 
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || '操作失败';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={isEditing ? `编辑物料 (ID: ${materialId})` : "🆕 新增基础物料"}
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            // 关闭时销毁子元素，确保下次打开是新的
            destroyOnClose={true}
        >
            <Spin spinning={initialLoading}> 
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item 
                        label="物料名称" 
                        name="name" 
                        rules={[{ required: true, message: '请输入物料名称' }]}
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
                            {isEditing ? '确认修改' : '确认创建'}
                        </Button>
                    </div>
                </Form>
            </Spin>
        </Modal>
    );
};

export default CreateMaterialModal;