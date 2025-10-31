import * as React from 'react';
import { makeStyles, shorthands } from '@griffel/react';
import { tokens } from './themes';

const useStyles = makeStyles({
  panel: {
    backgroundColor: tokens.background,
    color: tokens.foreground,
    ...shorthands.padding('8px'),
    ...shorthands.border('1px', 'solid', tokens.slotNameBorder),
    ...shorthands.margin('8px', '0'),
    fontFamily: 'system-ui',
    fontSize: '12px',
  },
  checkboxContainer: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '8px',
    marginBottom: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    columnGap: '6px',
  },
  checkbox: {
    cursor: 'pointer',
  },
  info: {
    ...shorthands.padding('8px'),
    backgroundColor: tokens.slotNameBackground,
    ...shorthands.border('1px', 'solid', tokens.slotNameBorder),
    ...shorthands.borderRadius('4px'),
    fontSize: '11px',
    lineHeight: '1.4',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  infoItem: {
    marginBottom: '2px',
  },
});

export const OverrideHighlightPanel: React.FC = () => {
  const classes = useStyles();
  const [highlightOverrides, setHighlightOverrides] = React.useState(false);
  const [highlightUiClasses, setHighlightUiClasses] = React.useState(false);
  const [selectedElementInfo, setSelectedElementInfo] = React.useState<{
    hasUiClass: boolean;
    hasOverrides: boolean;
    uiClasses: string[];
    overrideClasses: string[];
  } | null>(null);

  const getNoMatchMessage = () => {
    if (!selectedElementInfo) return null;

    const hasAnyMatch =
      (highlightUiClasses && selectedElementInfo.hasUiClass) ||
      (highlightOverrides && selectedElementInfo.hasOverrides);

    if (hasAnyMatch) return null;

    if (highlightUiClasses && highlightOverrides) {
      return 'No matching classes found on selected element';
    }
    if (highlightUiClasses) {
      return 'No UI classes found on selected element';
    }
    if (highlightOverrides) {
      return 'No override classes found on selected element';
    }
    return null;
  };

  // Effect to inject/remove highlighting styles
  React.useEffect(() => {
    if (!chrome.devtools) return;

    const code = `
      (function() {
        const existingStyle = document.getElementById('__griffel_devtools_highlight__');
        if (existingStyle) {
          existingStyle.remove();
        }

        if (${highlightOverrides} || ${highlightUiClasses}) {
          const style = document.createElement('style');
          style.id = '__griffel_devtools_highlight__';
          let cssRules = '';

          // Highlight UI classes
          if (${highlightUiClasses}) {
            const uiElements = document.querySelectorAll('[class*="ui-"]');
            uiElements.forEach(el => {
              el.setAttribute('data-griffel-ui-highlight', 'true');
            });
            cssRules += \`
              [data-griffel-ui-highlight] {
                outline: 2px dashed blue !important;
                outline-offset: 2px !important;
              }
            \`;
          } else {
            // Remove UI highlighting
            document.querySelectorAll('[data-griffel-ui-highlight]').forEach(el => {
              el.removeAttribute('data-griffel-ui-highlight');
            });
          }

          // Highlight override classes (elements with both ui- classes and griffel atomic classes)
          if (${highlightOverrides}) {
            const allElements = document.querySelectorAll('[class*="ui-"]');
            allElements.forEach(el => {
              const classList = Array.from(el.classList);
              const hasGriffelClass = classList.some(c => c.includes('___'));
              
              if (hasGriffelClass) {
                el.setAttribute('data-griffel-override-highlight', 'true');
              }
            });
            cssRules += \`
              [data-griffel-override-highlight] {
                outline: 2px dashed red !important;
                outline-offset: 2px !important;
              }
            \`;
          } else {
            // Remove override highlighting
            document.querySelectorAll('[data-griffel-override-highlight]').forEach(el => {
              el.removeAttribute('data-griffel-override-highlight');
            });
          }

          style.textContent = cssRules;
          document.head.appendChild(style);
        }
      })();
    `;

    chrome.devtools.inspectedWindow.eval(code);
  }, [highlightOverrides, highlightUiClasses]);

  // Effect to get info about selected element
  React.useEffect(() => {
    if (!chrome.devtools) return;
    if (!highlightOverrides && !highlightUiClasses) {
      setSelectedElementInfo(null);
      return;
    }

    const listener = () => {
      const code = `
        (function() {
          const element = $0;
          if (!element) return null;
          
          const classList = Array.from(element.classList);
          const uiClasses = classList.filter(c => c.startsWith('ui-'));
          const griffelClasses = classList.filter(c => c.includes('___'));
          
          const hasUiClass = uiClasses.length > 0;
          const hasOverrides = hasUiClass && griffelClasses.length > 0;
          
          return {
            hasUiClass: hasUiClass,
            hasOverrides: hasOverrides,
            uiClasses: uiClasses,
            overrideClasses: griffelClasses
          };
        })();
      `;

      chrome.devtools.inspectedWindow.eval(code, {}, (result: unknown) => {
        if (result) {
          setSelectedElementInfo(
            result as {
              hasUiClass: boolean;
              hasOverrides: boolean;
              uiClasses: string[];
              overrideClasses: string[];
            },
          );
        }
      });
    };

    chrome.devtools.panels.elements.onSelectionChanged.addListener(listener);
    listener(); // Get info for currently selected element

    return () => {
      chrome.devtools.panels.elements.onSelectionChanged.removeListener(listener);
    };
  }, [highlightOverrides, highlightUiClasses]);

  return (
    <div className={classes.panel}>
      <div className={classes.checkboxContainer}>
        <label className={classes.checkboxLabel}>
          <input
            type="checkbox"
            className={classes.checkbox}
            checked={highlightOverrides}
            onChange={e => setHighlightOverrides(e.target.checked)}
          />
          <span>Highlight overrides</span>
        </label>
        <label className={classes.checkboxLabel}>
          <input
            type="checkbox"
            className={classes.checkbox}
            checked={highlightUiClasses}
            onChange={e => setHighlightUiClasses(e.target.checked)}
          />
          <span>Highlight ui- classes</span>
        </label>
      </div>

      {selectedElementInfo && (highlightOverrides || highlightUiClasses) && (
        <div className={classes.info}>
          <div className={classes.infoTitle}>Selected Element Info:</div>
          {highlightUiClasses && selectedElementInfo.hasUiClass && (
            <div className={classes.infoItem}>
              <strong>UI Classes:</strong> {selectedElementInfo.uiClasses.join(', ')}
            </div>
          )}
          {highlightOverrides && selectedElementInfo.hasOverrides && (
            <div className={classes.infoItem}>
              <strong>Override Classes:</strong> {selectedElementInfo.overrideClasses.join(', ')}
            </div>
          )}
          {getNoMatchMessage() && <div className={classes.infoItem}>{getNoMatchMessage()}</div>}
        </div>
      )}
    </div>
  );
};
