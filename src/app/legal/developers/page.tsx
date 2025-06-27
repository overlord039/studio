import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, GitBranch, Share2 } from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Code className="mr-3 h-8 w-8 text-primary" /> For Developers
          </CardTitle>
          <CardDescription>
            Information about our technology stack and how to contribute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center mb-2"><GitBranch className="mr-2 h-5 w-5 text-accent" /> Our Tech Stack</h3>
            <p className="text-muted-foreground leading-relaxed">
              HousieHub is built with a modern, robust technology stack to ensure a real-time, scalable, and enjoyable user experience. Our primary stack includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2">
                <li><strong>Frontend:</strong> Next.js, React, TypeScript</li>
                <li><strong>Styling:</strong> Tailwind CSS, ShadCN UI</li>
                <li><strong>Backend & Real-time:</strong> Firebase / Cloud Functions</li>
                <li><strong>AI Features:</strong> Genkit</li>
            </ul>
          </div>
           <div>
            <h3 className="text-xl font-semibold flex items-center mb-2"><Share2 className="mr-2 h-5 w-5 text-accent" /> Contributing & API</h3>
            <p className="text-muted-foreground leading-relaxed">
              While our codebase is not currently open-source, we are exploring options for a public API that would allow developers to build their own integrations or alternative clients for HousieHub. Stay tuned for more information on this front. If you have ideas or wish to collaborate, please reach out through our support channels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
