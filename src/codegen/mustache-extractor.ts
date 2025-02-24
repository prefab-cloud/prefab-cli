import { z } from 'zod';

interface MustacheNode {
    name: string;
    isSection: boolean;
    isInverted: boolean;
    children: MustacheNode[];
}

export class MustacheExtractor {
    private static parseMustacheTemplate(template: string): MustacheNode[] {
        const tokens = template.match(/{{[^}]+}}|[^{}]+/g) || [];
        const root: MustacheNode[] = [];
        const stack: MustacheNode[][] = [root];

        tokens.forEach(token => {
            if (!token.startsWith('{{')) return;

            const content = token.slice(2, -2).trim();

            // Add check for partials
            if (content.startsWith('>')) {
                console.log(`Found Mustache partial: ${content.slice(1)}`);
                return;
            }

            if (content.startsWith('#')) {
                // Section start
                const name = content.slice(1);
                const newSection: MustacheNode = {
                    name,
                    isSection: true,
                    isInverted: false,
                    children: []
                };
                stack[stack.length - 1].push(newSection);
                stack.push(newSection.children);
            } else if (content.startsWith('^')) {
                // Inverted section
                const name = content.slice(1);
                const newSection: MustacheNode = {
                    name,
                    isSection: true,
                    isInverted: true,
                    children: []
                };
                stack[stack.length - 1].push(newSection);
                stack.push(newSection.children);
            } else if (content.startsWith('/')) {
                // Section end
                stack.pop();
            } else {
                // Regular variable
                stack[stack.length - 1].push({
                    name: content,
                    isSection: false,
                    isInverted: false,
                    children: []
                });
            }
        });

        return root;
    }

    private static generateZodSchema(nodes: MustacheNode[]): z.ZodObject<any> {
        const properties: Record<string, z.ZodTypeAny> = {};

        nodes.forEach(node => {
            if (node.isSection) {
                if (node.children.length > 0) {
                    const childSchema = this.generateZodSchema(node.children);
                    properties[node.name] = node.isInverted
                        ? childSchema.optional()
                        : z.array(childSchema);
                } else {
                    properties[node.name] = node.isInverted
                        ? z.boolean().optional()
                        : z.boolean();
                }
            } else {
                if (!properties[node.name]) {
                    properties[node.name] = z.string();
                }
            }
        });

        return z.object(properties);
    }

    static extractSchema(template: string): z.ZodObject<any> {
        const nodes = this.parseMustacheTemplate(template);
        return this.generateZodSchema(nodes);
    }
} 