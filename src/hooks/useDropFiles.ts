// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";


export function useDropFiles(onDrop: (paths: string[]) => void) {
  const [over, setOver] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const wv = getCurrentWebview();
      const u = await wv.onDragDropEvent((e) => {
        switch (e.payload.type) {
          case "enter":
          case "over":
            setOver(true);
            break;
          case "drop":
            setOver(false);
            onDrop(e.payload.paths);
            break;
          case "leave":
            setOver(false);
            break;
        }
      });
      unlisten = u;
    })();
    return () => { unlisten?.(); };
  }, [onDrop]);

  return { over };
}
