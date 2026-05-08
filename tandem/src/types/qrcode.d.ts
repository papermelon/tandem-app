declare module "qrcode" {
  interface Options {
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  function toDataURL(value: string, options?: Options): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}
