const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('balanceVision', {});
