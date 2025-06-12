export const environment = {
  production: true,
  baseUrl:window['env' as any]['baseUrl' as any]as unknown as string,
  customAuth: window['env' as any]['customAuth' as any]as unknown as string,
  stagingURl: window['env' as any]['stagingURl' as any]as unknown as string

};