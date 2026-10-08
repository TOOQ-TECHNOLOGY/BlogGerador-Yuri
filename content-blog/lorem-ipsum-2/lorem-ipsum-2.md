---
title: Lorem Ipsum 2
slug: lorem-ipsum-2
summary: "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...\" \"There is no one who loves pain itself, who seeks after it and wants to have it, simply because it is pain..."
date: 2026-10-06T08:00
author: Yusta
product: live-market-data
---
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.

## Subscribing to a feed

1. Request credentials for the **Live Market Data API**
2. Open a session with `connect()`
3. Subscribe to the instruments you need

```java
MarketData md = MarketData.connect("wss://md.tooq.cloud");
md.subscribe("PETR4", quote -> System.out.println(quote));
```

Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Read the [documentation](https://tooqtechnology.com) for details.

---

Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero.
