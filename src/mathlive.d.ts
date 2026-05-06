/// <reference types="react" />
import "mathlive";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          value?: string;
          "virtual-keyboard-mode"?: string;
          "smart-mode"?: boolean | string;
        },
        HTMLElement
      >;
    }
  }
}
export {};
