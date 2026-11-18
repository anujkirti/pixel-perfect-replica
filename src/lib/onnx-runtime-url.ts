// Keep the compressed binary in public, never in the server import graph.
export async function onnxRuntimeUrl() {
  const response = await fetch("/wasm/ort-wasm-simd-threaded.wasm.gz");
  if (!response.ok) throw new Error("The ONNX runtime could not be downloaded.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const blob = bytes[0] === 0x1f && bytes[1] === 0x8b
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).blob()
    : new Blob([bytes]);
  return URL.createObjectURL(new Blob([blob], { type: "application/wasm" }));
}