import React, { useEffect, useRef } from 'react';
import { language, cmtheme } from '../../src/atoms';
import { useRecoilValue } from 'recoil';
import ACTIONS from '../Actions';

// CODE MIRROR
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';

// theme
    import 'codemirror/theme/3024-day.css';
    import 'codemirror/theme/3024-night.css';
    import 'codemirror/theme/abbott.css';
    import 'codemirror/theme/abcdef.css';
    import 'codemirror/theme/ambiance.css';
    import 'codemirror/theme/ayu-dark.css';
    import 'codemirror/theme/ayu-mirage.css';
    import 'codemirror/theme/base16-dark.css';
    import 'codemirror/theme/base16-light.css';
    import 'codemirror/theme/bespin.css';
    import 'codemirror/theme/blackboard.css';
    import 'codemirror/theme/cobalt.css';
    import 'codemirror/theme/colorforth.css';
    import 'codemirror/theme/darcula.css';
    import 'codemirror/theme/dracula.css';
    import 'codemirror/theme/duotone-dark.css';
    import 'codemirror/theme/duotone-light.css';
    import 'codemirror/theme/eclipse.css';
    import 'codemirror/theme/elegant.css';
    import 'codemirror/theme/erlang-dark.css';
    import 'codemirror/theme/gruvbox-dark.css';
    import 'codemirror/theme/hopscotch.css';
    import 'codemirror/theme/icecoder.css';
    import 'codemirror/theme/idea.css';
    import 'codemirror/theme/isotope.css';
    import 'codemirror/theme/juejin.css';
    import 'codemirror/theme/lesser-dark.css';
    import 'codemirror/theme/liquibyte.css';
    import 'codemirror/theme/lucario.css';
    import 'codemirror/theme/material.css';
    import 'codemirror/theme/material-darker.css';
    import 'codemirror/theme/material-palenight.css';
    import 'codemirror/theme/material-ocean.css';
    import 'codemirror/theme/mbo.css';
    import 'codemirror/theme/mdn-like.css';
    import 'codemirror/theme/midnight.css';
    import 'codemirror/theme/monokai.css';
    import 'codemirror/theme/moxer.css';
    import 'codemirror/theme/neat.css';
    import 'codemirror/theme/neo.css';
    import 'codemirror/theme/night.css';
    import 'codemirror/theme/nord.css';
    import 'codemirror/theme/oceanic-next.css';
    import 'codemirror/theme/panda-syntax.css';
    import 'codemirror/theme/paraiso-dark.css';
    import 'codemirror/theme/paraiso-light.css';
    import 'codemirror/theme/pastel-on-dark.css';
    import 'codemirror/theme/railscasts.css';
    import 'codemirror/theme/rubyblue.css';
    import 'codemirror/theme/seti.css';
    import 'codemirror/theme/shadowfox.css';
    import 'codemirror/theme/solarized.css';
    import 'codemirror/theme/the-matrix.css';
    import 'codemirror/theme/tomorrow-night-bright.css';
    import 'codemirror/theme/tomorrow-night-eighties.css';
    import 'codemirror/theme/ttcn.css';
    import 'codemirror/theme/twilight.css';
    import 'codemirror/theme/vibrant-ink.css';
    import 'codemirror/theme/xq-dark.css';
    import 'codemirror/theme/xq-light.css';
    import 'codemirror/theme/yeti.css';
    import 'codemirror/theme/yonce.css';
    import 'codemirror/theme/zenburn.css';

// modes
    import 'codemirror/mode/clike/clike';
    import 'codemirror/mode/css/css';
    import 'codemirror/mode/dart/dart';
    import 'codemirror/mode/django/django';
    import 'codemirror/mode/dockerfile/dockerfile';
    import 'codemirror/mode/go/go';
    import 'codemirror/mode/htmlmixed/htmlmixed';
    import 'codemirror/mode/javascript/javascript';
    import 'codemirror/mode/jsx/jsx';
    import 'codemirror/mode/markdown/markdown';
    import 'codemirror/mode/php/php';
    import 'codemirror/mode/python/python';
    import 'codemirror/mode/r/r';
    import 'codemirror/mode/rust/rust';
    import 'codemirror/mode/ruby/ruby';
    import 'codemirror/mode/sass/sass';
    import 'codemirror/mode/shell/shell';
    import 'codemirror/mode/sql/sql';
    import 'codemirror/mode/swift/swift';
    import 'codemirror/mode/xml/xml';
    import 'codemirror/mode/yaml/yaml';

// features
    import 'codemirror/addon/edit/closetag';
    import 'codemirror/addon/edit/closebrackets';
// Removed custom scrollbars to only show native scrollbars when needed

//search
    import 'codemirror/addon/search/search.js';
    import 'codemirror/addon/search/searchcursor.js';
    import 'codemirror/addon/search/jump-to-line.js';
    import 'codemirror/addon/dialog/dialog.js';
    import 'codemirror/addon/dialog/dialog.css';

const Editor = ({ socketRef, roomId, tabId, onCodeChange, onSelectionToChat, externalCode, acceptRemote }) => {

    const editorRef = useRef(null);
    const wrapRef = useRef(null);
    const hoverRef = useRef({ visible: false, text: '', top: 0, left: 0 });
    const [hoverState, setHoverState] = React.useState({ visible: false, text: '', top: 0, left: 0 });
    const lang = useRecoilValue(language);
    const editorTheme = useRecoilValue(cmtheme);

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: { name: lang },
                    theme: editorTheme,
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                    lineWrapping: true,
                }
            );

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes || {};
                const code = instance.getValue();
                onCodeChange(code);
                if (acceptRemote && origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        tabId,
                        code,
                    });
                }
            });
            editorRef.current.on('cursorActivity', () => {
                const sel = editorRef.current.getSelection();
                const has = sel && sel.trim().length > 0;
                if (!has) {
                    hoverRef.current = { visible: false, text: '', top: 0, left: 0 };
                    setHoverState(hoverRef.current);
                    return;
                }
                const end = editorRef.current.getCursor('end');
                const coords = editorRef.current.cursorCoords(end, 'page');
                const rect = wrapRef.current.getBoundingClientRect();
                const top = coords.top - rect.top + 8;
                const left = Math.max(8, Math.min(coords.left - rect.left + 8, rect.width - 120));
                hoverRef.current = { visible: true, text: sel, top, left };
                setHoverState(hoverRef.current);
            });

        }
        init();
    }, [lang]);


    useEffect(() => {
        if (!editorRef.current) return;
        if (typeof externalCode === 'string') {
            editorRef.current.setValue(externalCode);
        }
    }, [externalCode]);



    useEffect(() => {
        let attached = false;
        const tryAttach = () => {
            if (attached || !socketRef.current) return;
            attached = true;
            // Remove any existing handler before attaching
            socketRef.current.off?.(ACTIONS.CODE_CHANGE);
            socketRef.current.on?.(ACTIONS.CODE_CHANGE, ({ code, tabId: incomingTabId }) => {
                if (!acceptRemote) return;
                if (incomingTabId !== tabId) return;
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        };

        // Attempt immediately and then fallback to a short poll until socket is ready
        tryAttach();
        const interval = setInterval(tryAttach, 100);

        return () => {
            clearInterval(interval);
            socketRef.current?.off?.(ACTIONS.CODE_CHANGE);
        };
    }, [roomId, socketRef, acceptRemote, tabId]);



    return (
            <div ref={wrapRef} className="editorRoot">
                <textarea id="realtimeEditor"></textarea>
                {hoverState.visible && (
                    <button
                        className="selectionHover"
                        style={{ top: hoverState.top, left: hoverState.left }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            onSelectionToChat?.(hoverState.text);
                            setHoverState({ visible: false, text: '', top: 0, left: 0 });
                        }}
                        title="Add to AI Chat"
                    >
                        Add to Chat
                    </button>
                )}
            </div>
    );
};

export default Editor;