import './globals.css';

export const metadata = {
  title: 'Stream Progress | BTECH',
  description: 'BTECH sample progress and delivery control dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
