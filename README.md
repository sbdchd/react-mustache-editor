# react-mustache-editor

An attempt at making a basic editor for inserting [mustache
templates](https://en.wikipedia.org/wiki/Mustache_%28template_system%29) and
rendering them with a custom element.

So far have tried [SlateJS](https://www.slatejs.org/examples/richtext) which
has a couple troubling bugs.

[DraftJS](https://draftjs.org) has problems around emoji.

Next thing to try:

<https://prosemirror.net>

- https://discuss.prosemirror.net/t/using-with-react/904
- https://discuss.prosemirror.net/t/lightweight-react-integration-example/2680
- maybe this but probably not: https://github.com/johnkueh/prosemirror-react-nodeviews

<https://quilljs.com>

- used in slack's message editor

- maybe this, probably see if Slack's using some OSS component or not first
  https://github.com/zenoamaro/react-quill

  - slack's component seems to be uncontrolled, it has an initialText value
    and a onChange but no obvious value prop.

https://app.dropkiq.com/demo

- closed source but does something similar

## dev

```shell
yarn install
yarn start
```
