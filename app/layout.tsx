import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AI Canvas - 创意团队协作平台',
  description: '基于AI驱动的无限画布，专为创意团队设计的灵感捕捉与方案整理工具',
  keywords: ['AI', '画布', '创意', '团队协作', '头脑风暴', '设计工具'],
  authors: [{ name: 'AI Canvas Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0f766e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
