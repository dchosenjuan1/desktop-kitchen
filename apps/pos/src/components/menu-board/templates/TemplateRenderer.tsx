import React, { Suspense } from 'react';
import { TEMPLATE_REGISTRY } from './index';
import type { TemplateViewProps } from '../../../types/menu-board';

const TemplateRenderer: React.FC<TemplateViewProps> = (props) => {
  const slug = props.brand.templateSlug;
  if (!slug) return null;

  const template = TEMPLATE_REGISTRY[slug];
  if (!template) return null;

  const Component = template.component;

  return (
    <Suspense
      fallback={
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: props.brand.theme.darkBg }}
        >
          <div className="text-white/30 animate-pulse">Loading...</div>
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
};

export default TemplateRenderer;
