declare module 'qrcode' {
  const QRCode: {
    toDataURL(text: string, options?: Record<string, any>): Promise<string>;
  };
  export default QRCode;
}
