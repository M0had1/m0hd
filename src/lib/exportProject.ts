import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileNode } from '@/types/ide';

export async function exportProjectAsZip(
  files: FileNode[],
  fileContents: Map<string, string>,
  projectName = 'project'
) {
  const zip = new JSZip();

  const addToZip = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === 'file') {
        const content = fileContents.get(node.path) ?? node.content ?? '';
        zip.file(node.path, content);
      }
      if (node.children) addToZip(node.children);
    }
  };

  addToZip(files);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${projectName}.zip`);
}
