function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sentineleye-model", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("models");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Model storage is unavailable in this browser."));
  });
}
export async function modelCache(
  action: "read" | "write" | "clear",
  value?: ArrayBuffer,
): Promise<ArrayBuffer | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("models", action === "read" ? "readonly" : "readwrite");
    const store = tx.objectStore("models");
    const req =
      action === "read"
        ? store.get("yolo")
        : action === "clear"
          ? store.delete("yolo")
          : store.put(value, "yolo");
    tx.oncomplete = () => {
      db.close();
      resolve(action === "read" ? req.result : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("Unable to save the model. Your browser storage may be full."));
    };
  });
}
