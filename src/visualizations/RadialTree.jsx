import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RadialTree = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const container = svgRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const radius = Math.min(width, height) / 2 * 0.9;
        
        d3.select(container).selectAll("*").remove();
        const tooltip = d3.select("#tooltip");

        const tree = d3.tree().size([2 * Math.PI, radius]).separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        const root = tree(d3.hierarchy(data).sort((a, b) => d3.ascending(a.data.name, b.data.name)));
        
        const svg = d3.select(container).append("svg").attr("viewBox", [-width / 2, -height / 2, width, height]);

        svg.append("g").selectAll("path").data(root.links()).join("path")
            .attr("class", "d3-link")
            .attr("d", d3.linkRadial().angle(d => d.x).radius(d => d.y));

        const node = svg.append("g").selectAll("g").data(root.descendants()).join("g")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

        node.append("circle").attr("class", "d3-node").attr("fill", d => d.children ? "#374151" : "#111827").attr("r", 3);
        
        node.append("text")
            .attr("transform", d => `rotate(${d.x >= Math.PI ? 180 : 0})`)
            .attr("dy", "0.31em")
            .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
            .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
            .text(d => d.data.name)
            .on("mouseover", (event, d) => tooltip.style("opacity", 1).html(d.ancestors().map(n => n.data.name).reverse().slice(1).join('/')))
            .on("mousemove", (event) => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px"))
            .on("mouseout", () => tooltip.style("opacity", 0));

    }, [data]);

    return <div ref={svgRef} className="w-full h-[70vh] flex items-center justify-center"></div>;
};

export default RadialTree;
