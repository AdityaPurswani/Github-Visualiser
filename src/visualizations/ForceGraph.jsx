import React, { useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as d3 from 'd3';

const ForceGraph = ({ data }) => {

    const graphData = useMemo(() => {
        if (!data) return { nodes: [], links: [] };

        const root = d3.hierarchy(data);
        const nodes = root.descendants();
        const links = root.links();

        const graphNodes = nodes.map(node => ({
            id: node.data.name,
            isLeaf: !node.children,
            path: node.ancestors().map(n => n.data.name).reverse().slice(1).join('/'),
            ...node.data
        }));

        const graphLinks = links.map(link => ({
            source: link.source.data.name,
            target: link.target.data.name
        }));

        return { nodes: graphNodes, links: graphLinks };

    }, [data]);

    return (
        <div className="h-[40vh] flex items-center justify-center mt-62">
            <ForceGraph3D
                graphData={graphData}
                
                // --- General Styling ---
                backgroundColor="#000000" // Black background
                showNavInfo={false}       // Hides the help text in the corner

                // --- Node Styling ---
                nodeLabel="path"
                nodeVal={node => node.isLeaf ? 6 : 10} // size
                nodeColor={node => node.isLeaf ? '#059669' : '#888888'} // Leaf: green, Parent: grey
                nodeOpacity={1}

                // --- Link Styling ---
                linkColor={() => '#444444'} // Dim grey for links
                linkWidth={1}
                linkOpacity={0.7}
            />
        </div>
    );
};

export default ForceGraph;