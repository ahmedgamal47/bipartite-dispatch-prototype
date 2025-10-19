import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { gridDistance, gridDisk } from 'h3-js';
import {
  Driver,
  DriverDocument,
  DriverStatus,
} from '../../drivers/schemas/driver.schema';
import type {
  PoolBatch,
  MatchingResult,
  MatchingAssignment,
  MatchingScorecard,
  MatchingCandidateScore,
} from '../types';

const EARTH_RADIUS_METERS = 6_371_000;

type DriverCandidate = {
  id: string;
  name: string;
  status: DriverStatus;
  location: {
    lat: number;
    lng: number;
    h3Index: string;
  };
  rating: number;
};

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
  ) {}

  async solve(batch: PoolBatch): Promise<MatchingResult> {
    const h3Ring = this.buildNeighborhood(batch.h3Index);
    const drivers = await this.driverModel
      .find({ status: 'available', 'location.h3Index': { $in: h3Ring } })
      .lean()
      .exec();

    const availableDrivers: DriverCandidate[] = drivers.map((driver) => ({
      id: driver._id.toString(),
      name: driver.name,
      status: driver.status as DriverStatus,
      location: driver.location,
      rating: driver.rating ?? 5,
    }));

    const {
      costMatrix,
      candidateMatrix,
      distances,
      distanceScores,
      ratingScores,
    } = this.buildCostMatrix(batch, availableDrivers);
    const assignmentPairs = this.solveAssignment(costMatrix);

    const assignments: MatchingAssignment[] = [];
    const unassigned: string[] = [];
    const scorecards: MatchingScorecard[] = [];
    const assignedDriverIds = new Set<string>();

    for (let i = 0; i < batch.trips.length; i++) {
      const trip = batch.trips[i];
      const candidates: MatchingCandidateScore[] = availableDrivers.map(
        (driver, j) => ({
          driverId: driver.id,
          driverName: driver.name,
          driverStatus: driver.status,
          distanceMeters: Math.round(distances[i]?.[j] ?? 0),
          distanceScore: this.roundScore(distanceScores[i]?.[j] ?? 1),
          rating: driver.rating,
          ratingScore: this.roundScore(ratingScores[i]?.[j] ?? 1),
          blendedCost: this.roundScore(
            costMatrix[i]?.[j] ?? this.noMatchCost(),
          ),
          isCandidate: candidateMatrix[i]?.[j] ?? false,
        }),
      );

      scorecards.push({
        tripId: trip.id,
        riderId: trip.riderId,
        candidates,
      });
    }

    for (const [tripIndex, driverIndex] of assignmentPairs) {
      const cost = costMatrix[tripIndex]?.[driverIndex];
      const candidate = candidateMatrix[tripIndex]?.[driverIndex];
      const distance = distances[tripIndex]?.[driverIndex];

      if (
        cost === undefined ||
        candidate === false ||
        cost >= this.noMatchCost()
      ) {
        unassigned.push(batch.trips[tripIndex].id);
        continue;
      }

      const driver = availableDrivers[driverIndex];
      if (assignedDriverIds.has(driver.id)) {
        unassigned.push(batch.trips[tripIndex].id);
        continue;
      }

      assignments.push({
        tripId: batch.trips[tripIndex].id,
        driverId: driver.id,
        driverName: driver.name,
        driverStatus: driver.status,
        distanceMeters: Math.round(distance ?? 0),
      });
      assignedDriverIds.add(driver.id);
    }

    // Any trip not present in assignments/unassigned from assignmentPairs should be marked unassigned.
    const assignedTripIds = new Set(assignments.map((a) => a.tripId));
    for (const trip of batch.trips) {
      if (!assignedTripIds.has(trip.id) && !unassigned.includes(trip.id)) {
        unassigned.push(trip.id);
      }
    }

    return {
      h3Index: batch.h3Index,
      tripIds: batch.trips.map((trip) => trip.id),
      assignments,
      unassigned,
      strategy: 'hungarian_distance_rating',
      generatedAt: new Date().toISOString(),
      metadata: {
        driversConsidered: availableDrivers.length,
      },
      scorecards,
    };
  }

  private buildNeighborhood(h3Index: string) {
    try {
      const disk = gridDisk(h3Index, 1);
      const neighbors = Array.isArray(disk) ? disk : Array.from(disk);
      const unique = Array.from(new Set(neighbors));
      if (unique.includes(h3Index)) {
        return unique;
      }
      return [h3Index, ...unique];
    } catch {
      return [h3Index];
    }
  }

  private haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  private buildCostMatrix(batch: PoolBatch, drivers: DriverCandidate[]) {
    const trips = batch.trips;
    const distanceMatrix: number[][] = [];
    const candidateMatrix: boolean[][] = [];
    const distanceScores: number[][] = [];
    const ratingScores: number[][] = [];

    // Pre-compute distances and candidate flags
    let maxDistance = 0;

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      distanceMatrix[i] = [];
      candidateMatrix[i] = [];
      distanceScores[i] = [];
      ratingScores[i] = [];

      for (let j = 0; j < drivers.length; j++) {
        const driver = drivers[j];
        const distance = this.haversineMeters(
          trip.pickup.lat,
          trip.pickup.lng,
          driver.location.lat,
          driver.location.lng,
        );

        distanceMatrix[i][j] = distance;

        const h3Distance = this.safeGridDistance(
          trip.pickup.h3Index,
          driver.location.h3Index,
        );
        const isCandidate = h3Distance !== null && h3Distance <= 1;
        candidateMatrix[i][j] = isCandidate;

        if (distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    if (maxDistance === 0) {
      maxDistance = 1;
    }

    const INF = this.noMatchCost();
    const costMatrix: number[][] = trips.map((trip, i) => {
      return drivers.map((driver, j) => {
        const candidate = candidateMatrix[i][j];
        const distance = distanceMatrix[i][j];
        const distanceScore = Math.min(distance / maxDistance, 1);
        const ratingScore = 1 - Math.min(Math.max(driver.rating / 5, 0), 1);
        const blended = 0.5 * distanceScore + 0.5 * ratingScore;

        distanceScores[i][j] = this.roundScore(distanceScore);
        ratingScores[i][j] = this.roundScore(ratingScore);

        return candidate ? blended : INF;
      });
    });

    return {
      costMatrix,
      candidateMatrix,
      distances: distanceMatrix,
      distanceScores,
      ratingScores,
    };
  }

  private safeGridDistance(origin: string, target: string): number | null {
    try {
      return gridDistance(origin, target);
    } catch {
      return null;
    }
  }

  private noMatchCost() {
    return 9999;
  }

  private solveAssignment(costMatrix: number[][]): Array<[number, number]> {
    const rows = costMatrix.length;
    const cols = costMatrix[0]?.length ?? 0;
    if (rows === 0 || cols === 0) {
      return [];
    }

    const size = Math.max(rows, cols);
    const padded = Array.from({ length: size }, (_, i) => {
      const row = costMatrix[i] ?? [];
      return [...row, ...Array(size - row.length).fill(this.noMatchCost())];
    });

    const assignment = this.hungarian(padded);

    return assignment
      .filter(([r, c]) => r < rows && c < cols)
      .map(([r, c]) => [r, c] as [number, number]);
  }

  private hungarian(matrix: number[][]): Array<[number, number]> {
    const n = matrix.length;
    const m = matrix[0].length;

    const u = new Array(n + 1).fill(0);
    const v = new Array(m + 1).fill(0);
    const p = new Array(m + 1).fill(0);
    const way = new Array(m + 1).fill(0);

    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(m + 1).fill(Infinity);
      const used = new Array(m + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= m; j++) {
          if (used[j]) continue;
          const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
        for (let j = 0; j <= m; j++) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else {
            minv[j] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const result: Array<[number, number]> = [];
    for (let j = 1; j <= m; j++) {
      if (p[j] !== 0) {
        result.push([p[j] - 1, j - 1]);
      }
    }
    return result;
  }

  private roundScore(value: number) {
    return Math.round(value * 1000) / 1000;
  }
}
