const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('balanceVision', {
  platform: process.platform,
});
