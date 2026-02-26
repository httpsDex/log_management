-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 26, 2026 at 03:06 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `it_office_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `borrowed_items`
--

CREATE TABLE `borrowed_items` (
  `id` int(11) NOT NULL,
  `borrower_name` varchar(255) NOT NULL,
  `office` varchar(255) NOT NULL,
  `item_borrowed` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `released_by` varchar(255) NOT NULL,
  `date_borrowed` date NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Pending','Returned') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `full_name`, `is_active`) VALUES
(1, 'Juan dela Cruz', 1),
(2, 'Maria Santos', 1),
(3, 'Jose Reyes', 1),
(4, 'Ana Garcia', 1),
(5, 'Pedro Bautista', 1);

-- --------------------------------------------------------

--
-- Table structure for table `offices`
--

CREATE TABLE `offices` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offices`
--

INSERT INTO `offices` (`id`, `name`) VALUES
(2, 'Administrative Division'),
(3, 'Finance Division'),
(4, 'Human Resource Division'),
(5, 'IT Division'),
(8, 'Legal Division'),
(1, 'Office of the Director'),
(6, 'Planning Division'),
(7, 'Records Division');

-- --------------------------------------------------------

--
-- Table structure for table `repairs`
--

CREATE TABLE `repairs` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `office` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `serial_specs` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `date_received` date NOT NULL,
  `received_by` varchar(255) NOT NULL,
  `problem_description` text NOT NULL,
  `repaired_by` varchar(255) DEFAULT NULL,
  `repair_comment` text DEFAULT NULL,
  `claimed_by` varchar(255) DEFAULT NULL,
  `date_claimed` date DEFAULT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Fixed','Unserviceable','Released') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2b$10$8pNa69iSgfdL8vMU9kRc7.mOU0UQJwAeEHs.eMW8FfrAbEs0o5Js.');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `borrowed_items`
--
ALTER TABLE `borrowed_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `full_name` (`full_name`);

--
-- Indexes for table `offices`
--
ALTER TABLE `offices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `repairs`
--
ALTER TABLE `repairs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `borrowed_items`
--
ALTER TABLE `borrowed_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `offices`
--
ALTER TABLE `offices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `repairs`
--
ALTER TABLE `repairs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
