'use client';

import {
  FluentProvider,
  webLightTheme,
  type Theme,
} from '@fluentui/react-components';
import { ReactNode } from 'react';

const theme: Theme = webLightTheme;

export const Providers = ({ children }: { children: ReactNode }) => {
  return <FluentProvider theme={theme}>{children}</FluentProvider>;
};
