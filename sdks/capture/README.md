# @crikket/capture

Embeddable capture SDK for collecting bug reports from websites.

## Install

```bash
npm install @crikket/capture
```

```bash
bun add @crikket/capture
```

## Quick Start

```ts
import * as capture from "@crikket/capture"

capture.init({
  key: "crk_example",
  host: "https://api.crikket.io"
})
```

`key` is intended to be publishable and safe for public client environments.
