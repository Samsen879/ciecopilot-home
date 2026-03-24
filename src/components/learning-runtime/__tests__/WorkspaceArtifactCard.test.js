import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkspaceArtifactCard from '../WorkspaceArtifactCard.js';

describe('WorkspaceArtifactCard', () => {
  test('renders canonical and linked-reference cards with explicit states and launch CTAs', () => {
    const html = renderToStaticMarkup(
      React.createElement('div', null, [
        React.createElement(WorkspaceArtifactCard, {
          key: 'canonical',
          card: {
            title: 'artifact-primary',
            kindLabel: 'Artifact',
            placementLabel: 'Canonical resident',
            description: 'Pinned to the canonical slot for this topic.',
            updatedAtLabel: 'Updated 2026-03-22T08:00:00.000Z',
            state: {
              label: 'Missing artifact content',
              tone: 'warning',
              message: 'The workspace knows which artifact belongs here, but its rendered content is missing from this projection.',
            },
            launch: {
              ctaLabel: 'Open artifact',
              launchPayload: {
                anchorKind: 'artifact',
                artifactId: 'artifact-primary',
              },
            },
          },
        }),
        React.createElement(WorkspaceArtifactCard, {
          key: 'linked',
          card: {
            title: 'artifact-linked-1',
            kindLabel: 'Artifact',
            placementLabel: 'Linked reference',
            description: 'Secondary-topic reference only.',
            updatedAtLabel: null,
            state: null,
            launch: null,
          },
        }),
      ]),
    );

    expect(html).toContain('Canonical resident');
    expect(html).toContain('Linked reference');
    expect(html).toContain('Missing artifact content');
    expect(html).toContain('Open artifact');
    expect(html).toContain('artifact-linked-1');
  });
});
