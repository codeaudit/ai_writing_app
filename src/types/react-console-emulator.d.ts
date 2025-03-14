declare module 'react-console-emulator' {
  import { ReactNode, CSSProperties } from 'react';

  interface Command {
    description?: string;
    usage?: string;
    fn: (...args: string[]) => string | ReactNode | void | Promise<string | ReactNode | void>;
  }

  interface TerminalProps {
    commands: Record<string, Command>;
    welcomeMessage?: string | ReactNode;
    promptLabel?: string;
    autoFocus?: boolean;
    style?: CSSProperties;
    contentStyle?: CSSProperties;
    className?: string;
    noDefaults?: boolean;
    noEchoBack?: boolean;
    dangerMode?: boolean;
    commandCallback?: (cmd: string, args: string[]) => void;
  }

  const Terminal: React.FC<TerminalProps>;
  export default Terminal;
} 