export function catalogImportBodies(items: unknown[], maxBytes: number): string[] {
  const prefix = '{"items":[';
  const suffix = ']}';
  const maxItems = 500;
  const bodies: string[] = [];
  let encodedItems: string[] = [];
  let bodyBytes = Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
  for (const item of items) {
    const encoded = JSON.stringify(item);
    if (encoded === undefined) throw new Error('catalog_item_not_serializable');
    const itemBytes = Buffer.byteLength(encoded);
    const separatorBytes = encodedItems.length ? 1 : 0;
    if (encodedItems.length >= maxItems || bodyBytes + separatorBytes + itemBytes > maxBytes) {
      if (!encodedItems.length) throw new Error('catalog_item_exceeds_import_request_limit');
      bodies.push(`${prefix}${encodedItems.join(',')}${suffix}`);
      encodedItems = [];
      bodyBytes = Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
    }
    const nextSeparatorBytes = encodedItems.length ? 1 : 0;
    if (bodyBytes + nextSeparatorBytes + itemBytes > maxBytes) throw new Error('catalog_item_exceeds_import_request_limit');
    encodedItems.push(encoded);
    bodyBytes += nextSeparatorBytes + itemBytes;
  }
  if (encodedItems.length) bodies.push(`${prefix}${encodedItems.join(',')}${suffix}`);
  return bodies;
}
