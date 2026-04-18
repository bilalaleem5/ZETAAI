import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)

const invoke = (ch: string, p?: unknown) => ipcRenderer.invoke(ch, p)

contextBridge.exposeInMainWorld('zeta', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close')
  },

  agent: {
    chat: (payload: {
      message: string; model: 'groq'
      agentMode: 'auto'|'coder'|'web'|'rag'|'builder'|'os'|'chat'
      conversationHistory: Array<{role:string;content:string}>
      context?: Record<string,unknown>
    }) => invoke('agent:chat', payload),

    onStreamToken: (cb: (token: string) => void) => {
      const h = (_: Electron.IpcRendererEvent, d: {token:string}) => cb(d.token)
      ipcRenderer.on('agent:stream-token', h)
      return () => ipcRenderer.removeListener('agent:stream-token', h)
    },
    onStreamComplete: (cb: (meta?: unknown) => void) => {
      const h = (_: Electron.IpcRendererEvent, d: {metadata?:unknown}) => cb(d.metadata)
      ipcRenderer.on('agent:stream-complete', h)
      return () => ipcRenderer.removeListener('agent:stream-complete', h)
    }
  },

  audio: { transcribe: (b64: string) => invoke('audio:transcribe', { base64Audio: b64 }) },

  os: {
    mouseMove:  (x:number,y:number) => invoke('os:mouse-move',   {x,y}),
    mouseClick: (x:number,y:number) => invoke('os:mouse-click',  {x,y}),
    typeText:   (text:string)       => invoke('os:type-text',    {text}),
    keyShortcut:(keys:string[])     => invoke('os:key-shortcut', {keys}),
    scroll:     (dir:string,amt?:number) => invoke('os:scroll',  {direction:dir,amount:amt}),
    listWindows:()                  => invoke('os:list-windows'),
    focusWindow:(title:string)      => invoke('os:focus-window', {title}),
    openApp:    (name:string)       => invoke('app:open',  {name}),
    closeApp:   (name:string)       => invoke('app:close', {name}),
  },

  fs: {
    readFile:   (filePath:string)              => invoke('fs:read-file',      {filePath}),
    writeFile:  (filePath:string,content:string)=>invoke('fs:write-file',     {filePath,content}),
    listDir:    (dirPath:string)               => invoke('fs:list-dir',       {dirPath}),
    createDir:  (dirPath:string)               => invoke('fs:create-dir',     {dirPath}),
    delete:     (filePath:string)              => invoke('fs:delete',         {filePath}),
    openEditor: (filePath:string)              => invoke('fs:open-in-editor', {filePath}),
    openFile:   (filePath:string)              => invoke('fs:open-file',      {filePath}),
  },

  web: {
    search:     (query:string) => invoke('web:search',       {query}),
    scrape:     (url:string)   => invoke('web:scrape',        {url}),
    summarize:  (url:string)   => invoke('web:summarize-url', {url}),
  },

  screen: {
    capture: () => invoke('screen:capture'),
    ocr:     () => invoke('screen:ocr'),
  },

  vault: {
    set:    (key:string,value:string) => invoke('vault:set-key',    {key,value}),
    get:    (key:string)              => invoke('vault:get-key',     {key}),
    delete: (key:string)              => invoke('vault:delete-key',  {key}),
    list:   ()                        => invoke('vault:list-keys'),
  },

  weather: {
    current:  (city?:string) => invoke('weather:current',  {city}),
    forecast: (city?:string) => invoke('weather:forecast', {city}),
  },

  news: {
    headlines: (category?:string) => invoke('news:headlines', {category}),
    search:    (query:string)     => invoke('news:search',     {query}),
  },

  calendar: {
    list:     ()                                        => invoke('calendar:list'),
    add:      (event:Record<string,string>)             => invoke('calendar:add',      {event}),
    delete:   (id:string)                               => invoke('calendar:delete',   {id}),
    today:    ()                                        => invoke('calendar:today'),
    upcoming: (days?:number)                            => invoke('calendar:upcoming', {days}),
  },
  reminders: {
    list:     ()                                => invoke('reminder:list'),
    add:      (text:string,datetime:string)     => invoke('reminder:add',      {text,datetime}),
    complete: (id:string)                       => invoke('reminder:complete', {id}),
    delete:   (id:string)                       => invoke('reminder:delete',   {id}),
    upcoming: ()                                => invoke('reminder:upcoming'),
  },

  // ── Memory / Task / CRM / Drafts ──────────────────────────────────────────
  memory: {
    tasks: {
      list:     (filter?:Record<string,string>) => invoke('memory:tasks:list',     filter),
      add:      (task:Record<string,string>)    => invoke('memory:tasks:add',      task),
      complete: (id:string)                     => invoke('memory:tasks:complete', {id}),
      delete:   (id:string)                     => invoke('memory:tasks:delete',   {id}),
      summary:  ()                              => invoke('memory:tasks:summary'),
    },
    leads: {
      list:   (status?:string)                  => invoke('memory:leads:list',   {status}),
      add:    (lead:Record<string,string>)      => invoke('memory:leads:add',    lead),
      status: (id:string,status:string)         => invoke('memory:leads:status', {id,status}),
    },
    drafts: {
      list:  ()                                 => invoke('memory:drafts:list'),
      save:  (draft:Record<string,string>)      => invoke('memory:drafts:save',  draft),
      sent:  (id:string)                        => invoke('memory:drafts:sent',  {id}),
    },
    contacts: {
      list:  ()                                 => invoke('memory:contacts:list'),
      add:   (c:Record<string,string>)          => invoke('memory:contacts:add', c),
      find:  (query:string)                     => invoke('memory:contacts:find',{query}),
    },
    briefing: ()                                => invoke('memory:briefing'),
  },

  rag: {
    ingest: (payload: Record<string, string>) => invoke('rag:ingest', payload),
    query:  (query:string)                  => invoke('rag:query',  {query}),
    clear:  ()                              => invoke('rag:clear'),
  },
})
