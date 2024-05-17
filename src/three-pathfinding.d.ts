import type { BufferGeometry, Object3D, Vector3 } from "three";

/**
 * Defines an instance of the pathfinding module, with one or more zones.
 */
export class Pathfinding {
    /**
     * Sets data for the given zone.
     * @param zoneID
     * @param zone
     */
    public setZoneData(zoneID: string, zone: Zone): void;

    /**
     * Returns a random node within a given range of a given position.
     * @param zoneID
     * @param groupID
     * @param nearPosition
     * @param nearRange
     */
    public getRandomNode(zoneID: string, groupID: number, nearPosition: Vector3, nearRange: number): Node;

    /**
     * Returns the closest node to the target position.
     * @param position
     * @param zoneID
     * @param groupID
     * @param checkPolygon (optional, default false)
     */
    public getClosestNode(position: Vector3, zoneID: string, groupID: number, checkPolygon?: boolean): Node;

    /**
     * Returns a path between given start and end points. If a complete path cannot be found, will return the nearest endpoint available.
     * @param startPosition Start position
     * @param targetPosition Destination
     * @param zoneID ID of current zone
     * @param groupID Current group ID
     * @returns Array of points defining the path
     */
    public findPath(startPosition: Vector3, targetPosition: Vector3, zoneID: string, groupID: number): Vector3[];

    /**
     * Returns closest node group ID for given position.
     * @param zoneID
     * @param position
     */
    public getGroup(zoneID: string, position: Vector3): number;

    /**
     * Clamps a step along the navmesh, given start and desired endpoint. May be used to constrain first-person / WASD controls.
     * @param start
     * @param end Desired endpoint.
     * @param node
     * @param zoneID
     * @param groupID
     * @param endTarget Updated endpoint.
     * @returns Updated node.
     */
    public clampStep(start: Vector3, end: Vector3, node: Node, zoneID: string, groupID: number, endTarget: Vector3): Node;

    /**
     * Builds a zone/node set from navigation mesh geometry.
     * @param geometry
     * @param tolerance Vertex welding tolerance. (optional, default 1e-4)
     */
    public static createZone(geometry: BufferGeometry, tolerance?: number): Zone;
}

/**
 * Helper for debugging pathfinding behavior.
 */
export class PathfindingHelper extends Object3D {
    public setPath(path: Vector3[]): this;

    public setPlayerPosition(position: Vector3): this;

    public setTargetPosition(position: Vector3): this;

    public setNodePosition(position: Vector3): this;

    public setStepPosition(position: Vector3): this;

    /**
     * Hides all markers.
     */
    public reset(): this;
}

/**
 * Defines a zone of interconnected groups on a navigation mesh.
 */
type Zone = {
    groups: Group[];
    vertices: Vector3[];
};

/**
 * Defines a group within a navigation mesh.
 */
type Group = {

};

/**
 * Defines a node (or polygon) within a group.
 */
type Node = {
    id: number;

    /**
     * IDs of neighboring nodes.
     */
    neighbours: number[];

    vertexIds: number[];

    centroid: Vector3;

    /**
     * Array of portals, each defined by two vertex IDs.
     */
    portals: number[][];

    closed: boolean;

    cost: number;
};
