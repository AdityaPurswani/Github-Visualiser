import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ForceGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !svgRef.current) return;
        
        const container = svgRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        d3.select(container).selectAll("*").remove();
        const tooltip = d3.select("#tooltip");
        
        const root = d3.hierarchy(data);
        const links = root.links();
        const nodes = root.descendants();

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(30).strength(1))
            .force("charge", d3.forceManyBody().strength(-40))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX())
            .force("y", d3.forceY());

        const svg = d3.select(container).append("svg").attr("viewBox", [0, 0, width, height]);

        const link = svg.append("g").selectAll("line").data(links).join("line").attr("class", "d3-link");
        const node = svg.append("g").selectAll("circle").data(nodes).join("circle")
            .attr("class", "d3-node")
            .attr("fill", d => d.children ? "#000000" : "#059669")
            .attr("r", d => d.children ? 10 : 6)
            .call(d3.drag()
                .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
            );

        node.on("mouseover", (event, d) => tooltip.style("opacity", 1).html(d.ancestors().map(n => n.data.name).reverse().slice(1).join('/')))
            .on("mousemove", (event) => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px"))
            .on("mouseout", () => tooltip.style("opacity", 0));

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("cx", d => d.x).attr("cy", d => d.y);
        });

    }, [data]);

    return <div ref={svgRef} className="w-full h-[70vh] flex items-center justify-center"></div>;
};

export default ForceGraph;