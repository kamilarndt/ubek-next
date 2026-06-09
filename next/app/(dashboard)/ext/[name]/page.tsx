import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const extensions: Record<
  string,
  {
    name: string;
    description: string;
    version: string;
    tools: string[];
    hasUi?: boolean;
  }
> = {
  "web-search": {
    name: "Web Search",
    description: "Search the web for current information",
    version: "1.0.0",
    tools: ["web_search"],
    hasUi: false,
  },
  vision: {
    name: "Vision",
    description: "Analyze an image from a URL",
    version: "1.0.0",
    tools: ["vision"],
    hasUi: false,
  },
  "document-gen": {
    name: "Document Gen",
    description: "Generate documents in markdown format",
    version: "1.0.0",
    tools: ["document_gen"],
    hasUi: false,
  },
  memory: {
    name: "Memory",
    description: "Store and retrieve information from long-term memory",
    version: "1.0.0",
    tools: ["memory"],
    hasUi: false,
  },
};

export default async function ExtensionPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const ext = extensions[name];

  if (!ext) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Extension not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          No extension named &quot;{name}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {ext.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {ext.description}
          </p>
        </div>
      </header>

      <div className="p-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Version</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {ext.version}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Identifier
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-medium font-mono">
                {name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Has UI</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {ext.hasUi ? "Yes" : "No (manifest/sidebar tools only)"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ext.tools.map((tool) => (
                <li
                  key={tool}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-gray-100 font-mono"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {!ext.hasUi && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This extension respects hasUi=false from manifest; no dedicated UI
            page is rendered (tools are used via chat when assigned to a
            project).
          </p>
        )}
      </div>
    </div>
  );
}
