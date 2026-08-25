import {
  Noto_Sans_Thai,
} from 'next/font/google';

import './globals.css';


const notoSansThai =
  Noto_Sans_Thai({
    subsets: [
      'thai',
      'latin',
    ],

    weight: [
      '400',
      '500',
      '600',
      '700',
    ],

    display: 'swap',

    variable:
      '--font-app',
  });


export const metadata = {
  title:
    'BTECH Sample Progress',

  description:
    'BTECH Sample Progress Control',
};


export default function RootLayout({
  children,
}) {
  return (
    <html lang="th">
      <body
        className={
          notoSansThai.variable
        }
      >
        {children}
      </body>
    </html>
  );
}