/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/config/storage';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useThemeContext } from '@/renderer/hooks/context/ThemeContext';
import { Button, Divider, Form, Input, Message } from '@arco-design/web-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { useSettingsViewMode } from '../settingsViewContext';

type GeminiConfig = Parameters<typeof ConfigStorage.set<'gemini.config'>>[1];

const toGeminiConfig = (config: Record<string, unknown>, accountProjects?: Record<string, string>): GeminiConfig => ({
  authType: typeof config.authType === 'string' ? config.authType : '',
  proxy: typeof config.proxy === 'string' ? config.proxy : '',
  GOOGLE_GEMINI_BASE_URL: typeof config.GOOGLE_GEMINI_BASE_URL === 'string' ? config.GOOGLE_GEMINI_BASE_URL : undefined,
  accountProjects: accountProjects && Object.keys(accountProjects).length > 0 ? accountProjects : undefined,
  yoloMode: typeof config.yoloMode === 'boolean' ? config.yoloMode : undefined,
  preferredMode: typeof config.preferredMode === 'string' ? config.preferredMode : undefined,
});

const GeminiModalContent: React.FC = () => {
  const { t } = useTranslation();
  const { theme: _theme } = useThemeContext();
  const [form] = Form.useForm();
  const [message, messageContext] = Message.useMessage();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';

  /**
   * 加载当前账号对应的 GOOGLE_CLOUD_PROJECT
   * Load GOOGLE_CLOUD_PROJECT for current account
   */

  // Track mount state to guard async message calls
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-save logic
  const readyRef = useRef(false);
  const saveTimerRef = useRef<number | undefined>(undefined);

  const saveConfig = useCallback(async () => {
    try {
      const values = form.getFieldsValue();
      const { GOOGLE_CLOUD_PROJECT, ...restConfig } = values;

      const geminiConfig = toGeminiConfig(restConfig, {});

      await ConfigStorage.set('gemini.config', geminiConfig);
    } catch (error: unknown) {
      console.error('[GeminiSettings] Auto-save failed:', error);
    }
  }, [form]);

  const debouncedSave = useCallback(() => {
    if (!readyRef.current) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void saveConfig();
    }, 500);
  }, [saveConfig]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    ConfigStorage.get('gemini.config')
      .then((geminiConfig) => {
        const formData = {
          ...geminiConfig,
        };
        form.setFieldsValue(formData);
        readyRef.current = true;
      })
      .catch((error) => {
        console.error('Failed to load configuration:', error);
      });
  }, []);

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}

      {/* Content Area */}
      <AionScrollArea className='flex-1 min-h-0' disableOverflow={isPageMode}>
        <div className='space-y-16px'>
          <div className='px-[12px] py-[24px] md:px-[32px] bg-2 rd-12px md:rd-16px border border-border-2'>
            <Form
              form={form}
              layout='horizontal'
              labelCol={{ flex: '140px' }}
              labelAlign='left'
              wrapperCol={{ flex: '1' }}
              onValuesChange={debouncedSave}
            >
              <Form.Item
                label={t('settings.proxyConfig')}
                field='proxy'
                layout='vertical'
                rules={[{ match: /^https?:\/\/.+$/, message: t('settings.proxyHttpOnly') }]}
              >
                <Input className='aion-input' placeholder={t('settings.proxyHttpOnly')} />
              </Form.Item>
              <Divider className='mt-0px mb-20px' />

              <Form.Item label='GOOGLE_CLOUD_PROJECT' field='GOOGLE_CLOUD_PROJECT' layout='vertical'>
                <Input className='aion-input' placeholder={t('settings.googleCloudProjectPlaceholder')} />
              </Form.Item>
            </Form>
          </div>
        </div>
      </AionScrollArea>
    </div>
  );
};

export default GeminiModalContent;
