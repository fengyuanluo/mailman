// Tab回调管理工具函数

// 全局回调注册表类型
type TabCallbacks = {
    [tabId: string]: {
        onReady?: (data: any) => void;
        [key: string]: any;
    };
};

// 创建全局回调注册表
if (typeof window !== 'undefined') {
    (window as any).__tabCallbacks = (window as any).__tabCallbacks || {};
}

// 注册Tab回调的工具函数
export function registerTabCallback(tabId: string, callbackName: string, callback: any) {
    if (typeof window === 'undefined') return;

    (window as any).__tabCallbacks = (window as any).__tabCallbacks || {};
    (window as any).__tabCallbacks[tabId] = (window as any).__tabCallbacks[tabId] || {};
    (window as any).__tabCallbacks[tabId][callbackName] = callback;

    console.log(`[registerTabCallback] 已注册${tabId}的${callbackName}回调`);
}

// 移除Tab回调的工具函数
export function unregisterTabCallback(tabId: string, callbackName?: string) {
    if (typeof window === 'undefined') return;

    if (!callbackName) {
        // 移除整个Tab的所有回调
        delete (window as any).__tabCallbacks[tabId];
    } else {
        // 只移除特定回调
        if ((window as any).__tabCallbacks?.[tabId]) {
            delete (window as any).__tabCallbacks[tabId][callbackName];
        }
    }
}