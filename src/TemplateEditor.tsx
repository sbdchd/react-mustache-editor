/*

Known glitches:

- when selecting all the text, a template at the end of the list isn't always
deleted.
- inserting mentions over other mentions can sometimes cause the thing to go
haywire
  Reproduction:
    - Select the entire text area content
    - While selected click the "insert" button to insert a new template
    - move the cursor to after the mention
    - insert another character
    - explodes

Based off https://www.slatejs.org/examples/mentions

*/
import React from "react"
import { Transforms, createEditor, Node } from "slate"
import { withHistory } from "slate-history"
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  useSelected,
  useFocused,
  RenderElementProps,
} from "slate-react"
import mustache from "mustache"

const TEMPLATE_NODE_TYPE = "mention"

function TemplateEditorInner(props: {
  value: Node[]
  onChange: (value: Node[]) => void
  attributeMapping: { [_: string]: string | undefined }
}) {
  const editor = React.useMemo(
    () => withMentions(withReact(withHistory(createEditor()))),
    [],
  )

  const Element = ({ attributes, children, element }: RenderElementProps) => {
    switch (element.type) {
      case TEMPLATE_NODE_TYPE: {
        const title = props.attributeMapping[element.character] ?? "?"
        return (
          <MentionElement
            attributes={attributes}
            children={children}
            element={element}
            title={title}
          />
        )
      }
      default: {
        return <p {...attributes}>{children}</p>
      }
    }
  }

  function handleInsert(e: React.MouseEvent) {
    // need to use preventDefault otherwise inserting the nodes causes the
    // cursor to appear in a different place and start acting weird.
    e.preventDefault()
    if (editor.selection) {
      insertMention(editor, "{{ foo bar buzz }}")
    }
  }

  return (
    <Slate
      editor={editor}
      value={props.value}
      onChange={value => {
        props.onChange(value)
      }}>
      <Editable renderElement={Element} placeholder="Enter some text..." />
      {/* NOTE: this must be onMouseDown otherwise the cursor will be in a weird place after insertion */}
      <button onMouseDown={handleInsert}>
        insert template var at cursor position
      </button>
    </Slate>
  )
}

function parse(text: string): ReturnType<typeof mustache.parse> {
  try {
    return mustache.parse(text)
  } catch (e) {
    return [["text", text, 0, text.length]]
  }
}

function getMentionLocations(str: string): Array<[number, number]> {
  return parse(str)
    .filter(x => x[0] === "name")
    .map(x => [x[2], x[3]])
}

function convertStrToNodes(str: string): Node[] {
  let output: Array<Node> = []
  for (let line of str.split("\n")) {
    let children: Array<Node["children"]> = []

    let tempLine = line

    // [[1,2], [7, 5]]
    // the quick brown [fox jumped] over the lazy dog
    let begin = 0
    for (const [start, end] of getMentionLocations(line)) {
      children.push({
        text: tempLine.slice(begin, start),
      })
      children.push({
        type: "mention",
        character: tempLine.slice(start, end),
        children: [{ text: "" }],
      })
      begin = end
    }
    if (begin > 0) {
      children.push({
        text: tempLine.slice(begin),
      })
    } else if (begin === 0) {
      children.push({
        text: tempLine,
      })
    }

    output.push({
      children,
    })
  }

  return output
}

function countFromNode(
  node: Node,
  attributeMapping: { [_: string]: string | undefined },
): number {
  let count = 0
  if (node.children) {
    for (const child of node.children) {
      if (typeof child.text === "string") {
        count += child.text.length
      } else if (child.type === TEMPLATE_NODE_TYPE) {
        count += (attributeMapping[child.character] ?? "").length
      }
    }
  }
  return count
}

function nodesToStr(nodes: Node[]): string {
  let str = ""
  for (const node of nodes) {
    if (node.children) {
      for (const child of node.children) {
        if (typeof child.text === "string") {
          str += child.text
        } else if (child.type === TEMPLATE_NODE_TYPE) {
          str += child.character
        }
      }
    }

    str += "\n"
  }

  return str.trimEnd()
}

function countFromNodes(
  nodes: Node[],
  attributeMapping: { [_: string]: string | undefined },
): number {
  let total = 0
  for (const node of nodes) {
    total += countFromNode(node, attributeMapping)
  }
  // each paragraph results in a new line in the output string so we add them up
  // too
  total += nodes.length - 1
  return total
}

const MAX_MESSAGE_COUNT = 150

function TemplateEditorNodeBased({
  value,
  attributeMapping,
  onChange,
}: {
  value: Node[]
  onChange: (_: Node[]) => void
  attributeMapping: { [_: string]: string | undefined }
}) {
  const charCount = countFromNodes(value, attributeMapping)

  const strValue = nodesToStr(value)

  return (
    <div style={{ display: "flex", alignItems: "start" }}>
      <div
        style={{
          border: "1px solid gray",
          padding: "1rem",
          borderRadius: 5,
          width: "40%",
        }}>
        <TemplateEditorInner
          value={value}
          onChange={onChange}
          attributeMapping={attributeMapping}
        />
        <div>
          {charCount}/{MAX_MESSAGE_COUNT}
        </div>
      </div>

      <pre style={{ paddingLeft: "1rem", width: "60%" }}>
        {JSON.stringify({ strValue, nodes: value }, null, 2)}
      </pre>
    </div>
  )
}

function TemplateEditorStrBased({
  value,
  attributeMapping,
  onChange,
}: {
  value: string
  onChange: (_: string) => void
  attributeMapping: { [_: string]: string | undefined }
}) {
  function handleOnChange(value: Node[]) {
    onChange(nodesToStr(value))
  }
  return (
    <TemplateEditorNodeBased
      value={convertStrToNodes(value)}
      onChange={handleOnChange}
      attributeMapping={attributeMapping}
    />
  )
}

function TemplateEditor({
  initialValue,
  attributeMapping,
}: {
  initialValue: string
  attributeMapping: { [_: string]: string | undefined }
}) {
  const [value, setValue] = React.useState(initialValue)
  return (
    <TemplateEditorStrBased
      value={value}
      onChange={setValue}
      attributeMapping={attributeMapping}
    />
  )
}

function TemplateEditorExample() {
  const initialValue = `\
An example outlining what a barebones mustache template editor
ends up looking like.
For example we can have an attribute {{ bar.2 }} or we could have
another attribute {{ foo.1 }}. They both should work. And we can
use the menu below to add more attributes.`
  const mapping: { [_: string]: string | undefined } = {
    "{{ bar.2 }}": "some really long value that's just so long",
    "{{ foo.1 }}": "another reallly really really really really long thing",
  }

  return (
    <div>
      <h5>template editor</h5>
      <TemplateEditor initialValue={initialValue} attributeMapping={mapping} />
    </div>
  )
}

function withMentions(editor: ReactEditor): ReactEditor {
  const { isInline, isVoid } = editor
  editor.isInline = el => {
    return el.type === TEMPLATE_NODE_TYPE || isInline(el)
  }
  editor.isVoid = el => {
    return el.type === TEMPLATE_NODE_TYPE || isVoid(el)
  }
  return editor
}

function insertMention(editor: ReactEditor, character: string) {
  const mention = {
    type: TEMPLATE_NODE_TYPE,
    character,
    children: [{ text: "" }],
  }
  Transforms.insertNodes(editor, mention)
}

function MentionElement({
  attributes,
  children,
  element,
  title,
}: RenderElementProps & { title: string }) {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <span
      {...attributes}
      contentEditable
      title={title}
      style={{
        position: "relative",
        padding: "3px 3px 2px",
        margin: "0 1px",
        borderRadius: 4,
        backgroundColor: "#eee",
        fontSize: "0.9rem",
        boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
      }}>
      {element.character}
      {children}
    </span>
  )
}

export default TemplateEditorExample
